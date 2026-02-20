---
title: ICS_PA4 实验报告
date: 2026-02-09 22:45:00
draft: false
tags:
- ICS
- PA
categories:
- 报告
math: true
---

## 实验进度

我已完成 PA4 的**所有必做内容**（虚实交错的魔法、分时多任务），成功实现了分页机制、进程上下文切换，并能够让**仙剑奇侠传**和 **Hello** 程序同时在 Nanos-lite 上分时运行。

---

## 必答题

### 分时多任务的具体过程

**问题：** 请结合代码, 解释分页机制和硬件中断是如何支撑仙剑奇侠传和hello程序在我们的计算机系统(Nanos-lite, AM, NEMU)中分时运行的。

**Solution:**

这一过程是**时钟中断驱动**与**虚拟内存隔离**共同作用的结果。我们可以将其拆解为以下几个关键步骤：



#### 初始准备与加载

在 `init_proc()` 中（`nanos-lite/src/proc.c:34-60`），Nanos-lite 加载了仙剑奇侠传、Hello、Menu 和 Nterm 四个程序。

```c
// pcb[0]: hello 
context_kload(&pcb[0], hello_fun, "hello");

// pcb[1]: 仙剑奇侠传 (PAL)
char *argv_pal[] = {"/bin/pal", "--skip", NULL};
char *envp_pal[] = {"PATH=/bin", NULL};
context_uload(&pcb[1], "/bin/pal", argv_pal, envp_pal);

```

* **虚拟地址空间创建：** `context_uload` 调用 `protect()`（`am/src/riscv/nemu/vme.c:47-54`），为每个进程分配独立的页目录表（Page Directory）并复制内核页表映射。
* **代码加载：** Loader（`nanos-lite/src/loader.c:49-100`）将 ELF 文件加载到各自虚拟地址空间。通过 `map()` 函数建立虚拟地址到物理页帧的映射，确保不同进程的虚拟地址映射到不同的物理内存页。

#### 中断触发 (The Trigger)

当仙剑奇侠传正在 CPU 上运行时，NEMU 的时钟设备定期产生中断信号（`mcause = 0x80000007`）。

* **硬件响应：** 硬件检测到中断，保存当前 PC 到 `mepc`，设置 `mcause`，并跳转到 `__am_asm_trap`（位于 `am/src/riscv/nemu/trap.S:44`）。

#### 保存现场 (Context Saving)

`trap.S`（`am/src/riscv/nemu/trap.S:44-94`）将仙剑奇侠传当前的通用寄存器、CSR 寄存器（包括 `mstatus`, `mepc` 等）压入当前进程的内核栈中，形成一个 `Context` 结构体。

```asm
__am_asm_trap:
  csrrw sp, mscratch, sp    # 交换sp和mscratch，从用户态切换到内核态
  bnez sp, .from_user       # 如果mscratch非零，说明来自用户态
  ...
.from_user:
  addi sp, sp, -CONTEXT_SIZE
  MAP(REGS, PUSH)           # 保存所有通用寄存器
  csrr t0, mscratch
  csrw mscratch, zero
  STORE t0, OFFSET_SP(sp)   # 保存用户态sp

```

* 此时保存的上下文包含该进程的地址空间标识（RISC-V 中为 `satp` 寄存器，通过 `__am_get_cur_as()` 保存到 `c->pdir`）。

#### 进程调度 (Scheduling)

控制权传递给 C 代码 `__am_irq_handle`（`am/src/riscv/nemu/cte.c:8-29`），最终调用 `schedule()`（`nanos-lite/src/proc.c:62-90`）。

```c
Context* schedule(Context *prev) {
  if (current != NULL) {
    current->cp = prev;      // 保存当前上下文
  }
  
  // 简单的轮转调度，支持前台进程权重
  int weight = (current == &pcb[fg_pcb]) ? FG_WEIGHT : HELLO_WEIGHT;
  current_t++;
  if (current_t >= weight) {
    current_t = 0; 
    if (current == &pcb[fg_pcb]) {
      current = &pcb[0];     // 切换到hello
    } else {
      current = &pcb[fg_pcb]; // 切换回前台进程
    }
  }
  return current->cp;
}

```

#### 上下文切换与地址空间切换 (The Switch)

这是最神奇的一步，发生在 `__am_switch()`（`am/src/riscv/nemu/vme.c:63-71`）。

```c
void __am_switch(Context *c) {
  if (vme_enable && c->pdir != NULL) {
    set_satp(c->pdir);       // 设置satp寄存器，切换页表
  }
}

static inline void set_satp(void *pdir) {
  uintptr_t mode = 1ul << (__riscv_xlen - 1);
  asm volatile("csrw satp, %0" : : "r"(mode | ((uintptr_t)pdir >> 12)));
}

```

* **栈切换：** 栈指针 `sp` 被修改为 Hello 进程的上下文地址（在 `trap.S` 中通过 `mv sp, a0` 恢复）。
* **地址空间切换：** 从 Hello 的上下文中恢复 `pdir` 到硬件的 MMU 基址寄存器 `satp`。
* **瞬间变化：** 一旦 `satp` 改变，CPU 看到的“整个世界”（内存映射）瞬间变了。原本属于仙剑的虚拟地址 `0x40000000` 可能映射到物理页 X，而现在同样的虚拟地址 `0x40000000` 映射到了物理页 Y（Hello 的代码）。



#### 恢复现场 (Restoration)

`trap.S`（`am/src/riscv/nemu/trap.S:78-94`）执行 `POP` 操作，将 Hello 进程之前冻结的寄存器值恢复到 CPU 中，最后执行 `mret`。CPU 跳转到 Hello 程序的 `PC` 继续执行。

```asm
  LOAD t1, OFFSET_STATUS(sp)
  LOAD t2, OFFSET_EPC(sp)
  csrw mstatus, t1
  csrw mepc, t2
  
  LOAD t0, OFFSET_SP(sp)
  csrw mscratch, t0     # 恢复用户态sp到mscratch
  
  MAP(REGS, POP)        # 恢复所有通用寄存器
  addi sp, sp, CONTEXT_SIZE
  ...
  mret                  # 返回到用户态

```

**总结：** 分页机制保证了两个程序在内存中互不干扰（空间隔离），时钟中断保证了控制权能周期性地回到操作系统手中（时间共享），从而实现了“同时”运行的错觉。

---

### 理解计算机系统 (段错误分析)

**问题：** 尝试在Linux中编写并运行以下程序:

```c
int main() {
  char *p = "abc";
  p[0] = 'A';
  return 0;
}

```

你会看到程序因为往只读字符串进行写入而触发了段错误。请你根据学习的知识和工具，从程序, 编译器, 链接器, 运行时环境, 操作系统和硬件等视角分析"字符串的写保护机制是如何实现的"。

**Solution:**
![报错信息](Segmentation_Fault.png)
段错误（Segmentation Fault）的发生是计算机系统各层级通力合作的结果，旨在保护内存安全。

1. **程序层 (C Language)**
* 在 C 语言语义中，`"abc"` 是一个**字符串字面量 (String Literal)**。
* 根据 C 标准，修改字符串字面量的行为是 **Undefined Behavior (UB)**。
* 变量 `p` 只是一个指针，它指向了这个字面量的首地址。


2. **编译器层 (Compiler - GCC)**
* GCC 在编译源代码时，会将字符串字面量 `"abc"` 放置在特定的 **Section** 中。
* 通常，这个 Section 是 `.rodata` (Read-Only Data)。
* 我们可以通过 `objdump -s` 查看目标文件，发现 `"abc"` 确实位于 `.rodata` 段。
![objdump结果](objdump.png)

1. **链接器层 (Linker - LD)**
* 链接器将多个目标文件合并为可执行文件 (ELF)。
* 它会将所有的 `.rodata` section 合并到一个 **Segment** 中。
* **关键点：** 链接器会将这个 Segment 标记为 **Read-Only (R)**。
* **工具验证：** 使用 `readelf -l test` 可以看到对应的 `LOAD` Segment 的 `Flg` 只有 `R` (Read)，没有 `W` (Write)。
![readelf结果](readelf.png)

1. **运行时环境/加载器层 (Loader - OS)**
* 当 Linux 执行该程序时，Loader 读取 ELF Header。
* Loader 请求内核分配物理内存，并建立虚拟内存映射。
* **关键动作：** Loader 告知内核，这段包含 `"abc"` 的虚拟内存页，其**权限必须严格设置为只读**。


1. **硬件层 (Hardware - MMU)**
* 当程序执行到 `p[0] = 'A'` 时，CPU 发出一条 `STORE` 指令，试图向虚拟地址 `p` 写入数据。
* **MMU (Memory Management Unit)** 拦截该请求，查询 TLB 或页表 (Page Table)。
* MMU 发现该虚拟地址对应的 **PTE (Page Table Entry)** 中的权限位（Permission Bits）禁止写入 (`Valid=1`, `Write=0`)。
* MMU 触发硬件异常（在 x86 上是 Page Fault，RISC-V 上是 Store Access Fault）。


6. **操作系统层 (OS - Kernel)**
* CPU 捕获异常，陷入内核态。
* 内核的 Page Fault Handler 检查出错原因。它发现这是一次**合法的映射**（地址有效），但是**权限违规**（试图写只读页）。
* 内核判定该进程非法操作，向该进程发送 **`SIGSEGV`** 信号。
* 进程收到信号，若无自定义处理，默认行为是 **Core Dump** 并终止运行。



**结论：** “写保护”是从 ELF 文件头部的标志位开始，一路传递到页表项的硬件权限位，最终由 MMU 硬件强制执行的铁律。

---

## 思考题：操作系统与未来

### 关于 Fork 的思考

讲义中提到 Nanos-lite 难以实现 `fork()`。通过 PA4 的学习，我理解到 `fork()` 的核心在于**地址空间的写时复制 (Copy-On-Write, COW)**。

如果直接完整复制父进程的物理内存给子进程，效率极低。现代 OS 通过将父子进程的页表项都设为“只读”，当任意一方尝试写入时，MMU 触发异常，OS 此时才分配新的物理页并复制数据。

```c
// COW 的简化流程示意：
// 1. fork时，父子共享物理页，PTE都设为只读
map(parent_pgdir, va, pa, PTE_R);  // 只读
map(child_pgdir, va, pa, PTE_R);   // 同样映射，只读

// 2. 任一进程写入时触发Page Fault
// 3. OS处理：分配新页、复制数据、更新页表为可写
void *new_pa = pgalloc();
memcpy(new_pa, pa, PGSIZE);
map(pgdir, va, new_pa, PTE_R | PTE_W);  // 现在可写

```

这在我的 Nanos-lite 中需要极强的内存管理模块支持，目前的实现还显得过于单薄。

### 崩溃一致性 (Crash Consistency)

在做文件系统实验时，我意识到仅仅把数据 `write` 进 buffer 并不安全。如果此时断电，数据就丢了。真正的文件系统（如 ext4, NTFS）需要 **Journaling (日志)** 机制，先记录“我要修改数据”这件事，再修改数据。这样即使断电，重启后也能根据日志恢复现场，保证文件系统不损坏。这让我对 PA3 中简单的文件系统有了更深的敬畏。

---

## 有趣的瞬间

### 成功运行分时多任务：仙剑与 Hello 并存
![多进程抢占式](final1.png)
```c
// proc.c 中的调度配置
#define FG_WEIGHT     100   // 前台进程权重（仙剑）
#define HELLO_WEIGHT  1     // 后台进程权重（Hello）

// 当仙剑运行时，每100个时间片才切换一次
// 当Hello运行时，每1个时间片就切换回仙剑

```
![多个进程](final2.png)

### 见证虚拟内存的魔法：同一个虚拟地址，不同的物理数据

在调试时，我观察到两个进程的页表（`satp`）指向不同的页目录，相同的虚拟地址 `0x40000000`（程序入口）却取到了不同的指令，这就是分页机制的威力。

### 调试 trap.S 的艰辛

在实验过程中，我修复了 `trap.S` 中的 bug。问题出在用户态和内核态的栈切换逻辑：

* 必须正确使用 `mscratch` 寄存器保存用户态栈指针
* 从用户态进入时要交换 `sp` 和 `mscratch`
* 恢复时要确保 `mscratch` 重新指向用户栈

```asm
csrrw sp, mscratch, sp    # 进入时交换
...
csrrw sp, mscratch, sp    # 退出时交换回来

```

---

## 实验心情

> 🤯 **痛并快乐着。**

PA4 是整个 PA 系列中难度陡增的一章。从理解 `satp` 寄存器如何切换“世界”，到调试各种玄学的 Page Fault，过程非常痛苦😭。特别是处理上下文切换时，栈指针 `sp` 只要错一个字节，整个系统就会莫名其妙地跑飞。

但当我在 Nanos-lite 上看到仙剑的画面流畅运行，而后台的 Hello 依然在顽强地输出字符时，那种对“并发”和“虚拟化”的理解瞬间具象化了。以前觉得高深莫测的概念，现在变成了我指尖的代码。

**I have truly created a world.**