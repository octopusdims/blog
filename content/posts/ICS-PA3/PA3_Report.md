---
title: ICS_PA3 实验报告
date: 2025-12-12 13:16:23
draft: false
tags:
- ICS
- PA
categories:
- 报告
math: true
---

## 实验进度

我已完成 PA3 的**所有内容**，并通过了**所有的测试样例**。

---
## 必答题
### 理解上下文结构体的前世今生
**问题：** 你会在`__am_irq_handle()`中看到有一个上下文结构指针`c`, `c`指向的上下文结构究竟在哪里? 这个上下文结构又是怎么来的? 具体地, 这个上下文结构有很多成员, 每一个成员究竟在哪里赋值的? `$ISA-nemu.h`, `trap.S`, 上述讲义文字, 以及你刚刚在NEMU中实现的新指令, 这四部分内容又有什么联系?



**Solution:**

```c
struct Context {
  // TODO: fix the order of these members to match trap.S
  uintptr_t gpr[NR_REGS]; 
  uintptr_t mcause;
  uintptr_t mstatus;
  uintptr_t mepc;
  void *pdir;
};
```

-----

#### 上下文结构 $c$ 的位置和来源

1.  上下文结构 $c$ 指向的结构体实例保存在**当前线程的内核栈上**。
2.  它是由 NEMU 的中断/异常处理汇编入口文件 **`trap.S`** 在中断/异常发生时，通过一系列汇编指令（主要是压栈操作）在栈上动态创建的。

-----

#### 上下文结构成员的赋值位置

所有成员的赋值都发生在 **`trap.S`** 文件中：

##### 2.1. 通用寄存器 (`gpr[NR_REGS]`)

  * **赋值位置：** `trap.S`。
  * **赋值方式：** 通过一系列 `sw` (store word) 或 `sd` (store doubleword) 指令（取决于 $32/64$ 位），将通用寄存器 $x1$ 到 $x31$（$x0$ 寄存器为 $0$，通常不需保存或以 $0$ 占位）的值依次压入栈中。
  * **关键点：** 这是保存现场的第一步，占用 $Context$ 结构体中最大的连续内存块。

##### 2.2. 特权/系统寄存器 (`mcause`, `mstatus`, `mepc`)

这三个寄存器是 RISC-V 异常处理的核心，它们由硬件和软件协同赋值：

  * **`mepc` (Machine Exception Program Counter):**
      * **硬件赋值：** 异常发生时，CPU 硬件将导致异常的指令地址（或紧随其后的指令地址）写入 $mepc$ 寄存器。
      * **软件保存：** 在 `trap.S` 中，通过 `csrr` (Control and Status Register Read) 指令将 $mepc$ 的值读出到临时通用寄存器，然后通过 `sw`/`sd` 指令存入栈中对应位置。
  * **`mstatus` (Machine Status Register):**
      * **硬件赋值：** 异常发生时，CPU 硬件更新 $mstatus$ 中的相关位（如设置 $MPP/MPIE$），以管理特权级和中断使能状态。
      * **软件保存：** 在 `trap.S` 中，通过 `csrr` 指令读出 $mstatus$ 的值，并存入栈中。
  * **`mcause` (Machine Cause Register):**
      * **硬件赋值：** 异常发生时，CPU 硬件将异常/中断的原因编号写入 $mcause$ 寄存器。
      * **软件保存：** 在 `trap.S` 中，通过 `csrr` 指令读出 $mcause$ 的值，并存入栈中。

##### 2.3. 地址空间 (`pdir`)

  * **赋值位置：** `trap.S`。
  * **赋值方式：** $pdir$ 通常对应于 RISC-V 的 **$SATP$** (Supervisor Address Translation and Protection) 寄存器，它保存着页表的基地址。在 `trap.S` 中，通过 `csrr` 指令读取 $SATP$ 的值，并将其存入栈中 $pdir$ 成员对应的位置。
  * **注意：** 讲义提到，MIPS32 和 RISC-V 可能将地址空间信息与 $0$ 号寄存器共用存储空间（即压入 $0$ 占位），但如果用于 $PA4$ 切换地址空间，则必须保存 $SATP$ 寄存器的真实值。

-----

#### 四部分内容的联系

1.  **`ISA-nemu.h`：** 定义了上下文结构体的**内存布局**。
2.  **`trap.S`：** 实现了根据该定义在栈上**创建和填充**上下文结构 $c$ 的具体动作（汇编）。
3.  **实现的新指令(自陷)：** 是**触发**整个异常处理流程的源头。
4.  **上述讲义文字：** 讲解了整个流程（异常处理、状态保存/恢复、上下文切换）的**理论基础**。

**四者的联系是：** 当新指令触发异常时，`trap.S` 依据 `ISA-nemu.h` 的定义创建 $c$，随后将 $c$ 传递给 C 语言处理函数，实现讲义中描述的异常处理功能。

### 理解穿越时空的旅程

**问题：** 从yield test调用yield()开始, 到从yield()返回的期间, 这一趟旅程具体经历了什么? 软(AM, yield test)硬(NEMU)件是如何相互协助来完成这趟旅程的?

**Solution**

这趟“穿越时空的旅程”本质上是一次**用户态陷入内核、保存上下文、调度切换、恢复上下文并返回**的完整过程。它依赖于软件（AM 的异常处理例程）构建的数据结构和逻辑，以及硬件（NEMU）提供的异常响应机制。

我们可以将整个旅程拆解为四个阶段。

#### 启程

旅程始于 `yield-test` 程序调用 AM 提供的 `yield()` 函数。

  * **软件行为 (`yield()`):**
    在 RISC-V 架构下，`yield()` 的核心是两条汇编指令：

    ```c
    // abstract-machine/am/src/riscv/nemu/cte.c
    void yield() {
      asm volatile("li a7, -1; ecall"); 
    }
    ```

    1.  `li a7, -1`: 将立即数 -1 写入 `a7` 寄存器。这是 AM 约定的“事件暗号”，用于告诉内核这是一个 `yield` 请求。
    2.  `ecall`: 执行环境调用指令，主动触发异常。

  * **硬件行为 (NEMU `isa_raise_intr`):**
    当 NEMU 执行到 `ecall` 时，硬件电路（模拟器逻辑）被激活：

    1.  **设置异常号**: 将 `mcause` 寄存器设置为 `0xb` (Environment call from M-mode)。
    2.  **保存断点**: 将当前的 PC 值（即 `ecall` 的地址）保存到 `mepc` 寄存器中。
    3.  **跳转**: 将 PC 设置为 `mtvec` 寄存器的值。在 `cte_init` 中，`mtvec` 已被初始化指向 `__am_asm_trap`。

#### 上下文的保存

控制流跳转到了汇编入口 `__am_asm_trap`。此时，CPU 的状态（寄存器值）就是“现在的我”，我们需要把它冻结并保存下来。

  * **Context 结构体的前世今生：**
    在进入这段汇编之前，`Context` 只是一个 C 语言定义的结构体模板。而随着 `__am_asm_trap` 的执行，它在栈上被实体化了。

    ```asm
    # abstract-machine/am/src/riscv/nemu/trap.S
    __am_asm_trap:
        addi sp, sp, -CONTEXT_SIZE  # 1. 在栈上开辟空间

        # 2. 保存通用寄存器 (GPRs)
        # 使用宏 MAP(REGS, PUSH) 自动展开为一系列 STORE 指令
        # 注意：REGS 宏中不包含 x0 和 x2(sp)
        MAP(REGS, PUSH)

        # 3. 保存 CSRs
        csrr t0, mcause
        csrr t1, mstatus
        csrr t2, mepc

        STORE t0, OFFSET_CAUSE(sp)
        STORE t1, OFFSET_STATUS(sp)
        STORE t2, OFFSET_EPC(sp)
    ```

    这里的 MAP(REGS, PUSH) 宏会展开为一连串的 STORE 指令（sw 或 sd），将 CPU 里的通用寄存器一个个“搬运”到了内存堆栈中。此时，栈顶指针 sp 所指向的内存区域，就严格对应了 C 语言中的 Context 结构体。

    软件（汇编宏指令）利用硬件（STORE）将硬件状态（寄存器）写入了内存。至此，“现在的我”被封存为一个 Context 结构体

#### C 语言核心处理

保存完毕后，汇编代码执行 `mv a0, sp`，将当前的栈顶地址（即刚才保存好的 `Context` 结构体的指针）作为参数，传递给 C 函数 `jal __am_irq_handle`。

  * **事件分发 (`__am_irq_handle`):**
    ```c
    // abstract-machine/am/src/riscv/nemu/cte.c
    Context* __am_irq_handle(Context *c) {
      if (user_handler) {
        Event ev = {0};
        switch (c->mcause) {
          case 0x0b: // 对应 ecall
            if (c->GPR1 == -1) { // 检查 a7 是否为 -1
              ev.event = EVENT_YIELD; 
            }
            c->mepc += 4; // 关键：将返回地址 +4，跳过 ecall 指令
            break;
          ...
        }
        // 核心调度点
        c = user_handler(ev, c); 
      }
      return c;
    }
    ```
    1.  **识别**: 根据 `c->mcause` (0xb) 和 `c->GPR1` (-1)，识别出这是 `EVENT_YIELD`。
    2.  **修正**: 执行 `c->mepc += 4`。这是因为 `mepc` 存的是 `ecall` 的地址，如果不加 4，返回后会死循环执行 `ecall`。
    3.  **调度**: 调用 `user_handler(ev, c)`。
          * `user_handler`（在 `yield-test` 中是 `simple_trap`）接收了**当前线程 A** 的 Context 指针 `c`。
          * 调度器可能会决定切换到**线程 B**。它会把线程 A 的 `c` 存起来，然后**返回线程 B 的 Context 指针**。
          * 因此，`__am_irq_handle` 最后 `return c` 时，这个 `c` 已经指向了另一个线程的栈空间。

#### 上下文恢复

C 函数返回后，回到了 `__am_asm_trap` 的后半部分。此时 `a0` 寄存器里装着**目标线程**的 Context 指针。

  * **栈切换 (`mv a0, sp`):**
    这是最关键的一行汇编。`sp` 被修改为目标线程的上下文地址。这意味着我们从线程 A 的栈“跳”到了线程 B 的栈。

  * **恢复硬件状态:**

    ```asm
    # abstract-machine/am/src/riscv/nemu/trap.S
    __am_asm_trap:
        ...
        mv sp, a0          # 关键：切换栈指针到目标 Context

        # 1. 恢复 CSRs (主要是 mstatus 和 mepc)
        LOAD t1, OFFSET_STATUS(sp)
        LOAD t2, OFFSET_EPC(sp)
        csrw mstatus, t1
        csrw mepc, t2

        # 2. 恢复通用寄存器
        # 使用宏 MAP(REGS, POP) 自动展开为一系列 LOAD 指令
        MAP(REGS, POP)

        # 3. 释放栈空间
        addi sp, sp, CONTEXT_SIZE

        # 4. 硬件返回
        mret
    ```

    `MAP(REGS, POP)` 宏展开后的一系列 LOAD 指令将目标线程沉睡前保存的值重新装填进 CPU 寄存器。

  * **穿越完成 (`mret`):**
    最后执行 `mret` 指令。NEMU 硬件响应该指令：

    1.  **恢复 PC**: 将 `mepc` 的值（目标线程被打断时的下一条指令地址）写入 PC。
    2.  **特权级切换**: 恢复机器模式状态。

    当 `mret` 执行完毕，CPU 的 PC 指向了目标代码，所有的寄存器也变回了目标线程的样子。对于目标线程而言，感觉就像是从 `yield()` 函数里“返回”了一样（实际上是刚从上一次的 `ecall` 后面返回）。

### Hello 程序是什么, 它从而何来, 要到哪里去
**问题：** 我们知道 `navy-apps/tests/hello/hello.c` 只是一个 C 源文件... Hello 程序一开始在哪里? 它是怎么出现内存中的? 为什么会出现在目前的内存位置? 它的第一条指令在哪里? 究竟是怎么执行到它的第一条指令的? Hello 程序在不断地打印字符串, 每一个字符又是经历了什么才会最终出现在终端上?

**Solution:**

#### 从代码到静态 ELF

1. **编译与链接：** 在 Navy-apps 环境下，通过交叉编译工具链，它被编译并链接成为 **ELF (Executable and Linkable Format)** 可执行文件。
2. **Ramdisk：** 在目前的 PA 阶段，我们还没有真正的硬盘驱动。编译生成的 `hello` ELF 文件实际上被打包进了 Nanos-lite 的镜像中，或者更具体地说，它位于 **Ramdisk** (内存模拟磁盘) 中。在 `nanos-lite/src/resources.S` 中，`ramdisk.img` 被包含在内核的代码段/数据段中。
* 此时，Hello 程序只是 Ramdisk 这一大块字节串中，偏移量为 `0` (假设它是第一个文件) 的一段静止的二进制数据。



#### 加载

* **加载过程 (`loader`)：**
当 Nanos-lite 启动并决定运行 Hello 时，它调用 `loader()` 函数。`loader` 首先通过 `ramdisk_read` 读取 ELF Header，解析其中的 Program Header Table。
* **内存位置的确定：**
Loader 遍历 Program Header，寻找类型为 `PT_LOAD` 的段。它读取该段的 `VirtAddr` (虚拟内存地址) 和 `Offset` (文件偏移)。
* **为什么是这里？** 这个 `VirtAddr` (例如 MIPS/RISC-V 下通常是 `0x83000000` 附近) 并非随机选择，而是由 Navy-apps 编译时的 **链接脚本 (`LD` script)** 决定的。链接器约定了用户程序在内存中的位置，Loader 必须严格遵守这一约定，将代码和数据通过 `ramdisk_read` 拷贝到物理内存的对应位置。
* 对于 `.bss` 段（未初始化数据），Loader 还会根据 `MemSiz` 大于 `FileSiz` 的部分，将多出的内存空间清零。



#### 跳转

* **第一条指令 (`Entry Point`)：**
ELF Header 中的 `e_entry` 字段记录了程序的入口地址。对于 Navy 程序，这个入口通常是 `_start` 函数（位于 `crt0.S`），它负责初始化 C 运行环境并调用 `main`。
* **伪造现场 (Context Creation)：**
Nanos-lite 并不会直接 `jmp` 到入口地址，而是采用了一种“欺骗”硬件的手段——**构造中断上下文**。
在 `naive_uload` 中，内核调用 `new_context` 创建一个陷阱上下文结构体 `Context`。最关键的一步是：将这个结构体中的 `mepc` (对于 RISC-V) 设置为 ELF 的入口地址 `e_entry`。
* **执行第一条指令：**
内核随后调用 `_switch` 或直接从中断处理函数返回。代码执行流进入 `trap.S` 的恢复逻辑（参考上一题“穿越时空的旅程”），最终执行 **`mret`** 指令。
硬件响应 `mret`，将 PC 寄存器强行设置为 `mepc` 的值（即 Hello 的入口地址），并将特权级切换回用户模式。
**此刻，Hello 程序加载成功，CPU 开始执行它的第一条指令。**

#### 执行
1. **用户态 (Navy)：**
`printf` 进行字符串格式化后，最终调用到 `libos/src/syscall.c` 中的 **`_write`** 函数。
2. **触发异常 (The Trap)：**
`_write` 将系统调用号 (`SYS_write`)、文件描述符 (`stdout/1`)、缓冲区地址和长度放入约定好的寄存器（如 RISC-V 的 `a0`-`a7`），然后执行自陷指令 **`ecall`**。
3. **内核态 (Nanos-lite)：**
CPU 捕获异常，保存上下文，跳转到 `__am_asm_trap`，最终进入 `do_syscall`。
`do_syscall` 从上下文中读取系统调用号，识别出这是 `SYS_write`。
对于 `fd == 1` (stdout) 的情况，内核调用 AM 提供的 **`putch`** 函数。
4. **硬件层 (NEMU)：**
`putch` 实际上是向特定的 **MMIO (内存映射 I/O)** 地址（例如串口的数据寄存器地址）写入一个字节。
NEMU 的 `vmem` 模块监测到对该物理地址的写入操作，拦截该请求，并调用宿主机的 `putchar`，将字符打印在屏幕上。

---

### 仙剑奇侠传究竟如何运行
**问题：** 库函数, libos, Nanos-lite, AM, NEMU是如何相互协助, 来帮助仙剑奇侠传的代码从mgo.mkf文件中读出仙鹤的像素信息, 并且更新到屏幕上?

**Solution:**

整个过程是一次跨越计算机系统所有层次的接力跑。我们可以将仙鹤像素的旅程分为两个阶段：**从文件到内存（读取阶段）** 和 **从内存到屏幕（显示阶段）**。

#### 阶段一：从 mgo.mkf 到用户缓冲区 (读取)
1. **应用层 (User App): 发起请求**
在 `PAL_SplashScreen()` 函数中，代码调用了 `PAL_MKFReadChunk(buf, ..., SPRITENUM_SPLASH_CRANE, gpGlobals->f.fpMGO)`。
* 这里的 `fpMGO` 是指向 `mgo.mkf` 的文件指针。
* 该函数内部会调用标准库函数 `fseek` 定位偏移量，然后调用 `fread` 请求读取数据。

2. **库函数与 LibOS (libc & libos): 封装系统调用**
`fread` 是 Newlib 提供的 C 标准库函数。它最终会调用底层系统调用接口 `_read`。
在 `navy-apps/libs/libos/src/syscall.c` 中，`_read` 将参数（系统调用号 `SYS_read`、文件描述符 `fd`、缓冲区地址 `buf`、长度 `len`）放入寄存器（如 RISC-V 的 `a0`-`a7`），并执行 **自陷指令 (`ecall`)**。

3. **操作系统 (Nanos-lite): 文件系统处理**
CPU 响应自陷，切换到内核态，跳转到 `nanos-lite` 的异常处理入口 `do_syscall`。
* 内核识别出 `SYS_read`，调用 `fs_read`。
* `fs_read` 根据 `fd` 找到文件表中的 `mgo.mkf`，利用 `ramdisk_read`（因为目前文件系统基于 Ramdisk）从内存模拟的磁盘中，将仙鹤的压缩像素数据 **拷贝 (`memcpy`)** 到用户传入的缓冲区 `buf` 中。
* 读取完成后，内核通过 `mret` 返回用户态。

4. **数据解压 (Computation)**
回到应用层，`PAL_SplashScreen` 紧接着调用 `Decompress(buf, lpSpriteCrane, ...)`。这一步纯粹是 **NEMU** 执行通用指令，将压缩数据还原为原始像素数据，存放在 `lpSpriteCrane` 指向的内存中。

#### 阶段二：从用户缓冲区到屏幕 (显示)
1. **应用层 (User App): 准备画布**
在循环中，程序计算仙鹤的坐标，调用 `PAL_RLEBlitToSurface` 将仙鹤的像素点画到一个软件模拟的 `SDL_Surface`（内存缓冲区）上。
最后，调用 **`VIDEO_UpdateScreen(NULL)`** 请求刷新屏幕。

2. **中间件 (NDL & MiniSDL): 抽象图形接口**
`VIDEO_UpdateScreen` 属于 `libminiSDL`，它底层调用 `NDL_DrawRect` (Nanos-lite Display Library)。
`NDL_DrawRect` 将这一请求转化为对设备文件的写入操作：它打开（或复用）`/dev/fb`（帧缓冲设备），并调用 `write`。

3. **系统调用再次触发 (Trap)**
类似于读取阶段，`write` 再次触发 `ecall`，陷入内核。这次的系统调用号是 `SYS_write`。

4. **操作系统 (Nanos-lite): 设备驱动**
内核的 `do_syscall` 识别出 `SYS_write`。
`fs_write` 发现目标 `fd` 对应的是 `/dev/fb`，于是调用显示设备的写操作句柄（通常对应 `events.c` 或 `device.c` 中的 `fb_write`）。
`fb_write` 计算显存偏移量，最终调用 **AM** 提供的 IO 接口。

5. **抽象机器 (AM): 架构无关的 IO**
AM 执行 `io_write(AM_GPU_FBDRAW, ...)`。在 NEMU 的实现中，这通常意味着将像素数据通过 `memcpy` 拷贝到一段特定的物理内存区域（**VMEM**，显存），或者写入特定的 **MMIO** 寄存器以触发同步。
6. **硬件模拟 (NEMU): 最终呈现**
当 AM 写入 VMEM 时，数据实际上写入了 NEMU 申请的数组中。
NEMU 的 `vga_update_screen`（或类似函数）在每一帧结束时被调用，它读取这段 VMEM 数组，利用宿主机的图形库（SDL），将这些像素点真正的“画”在宿主机的窗口上。

**总结：**
仙鹤的像素数据，始于 `ramdisk` 的二进制流，经过 `fs_read` 的搬运进入用户内存，经由 CPU (`Decompress`) 的解压计算，再通过 `NDL` 和 `fb_write` 的层层封装，最终被写入显存，由 NEMU 的模拟硬件展示。这正是软件（Navy/Nanos-lite）、中间件（AM）与硬件（NEMU）紧密协作的结果。

## 思考题
### 对比异常处理与函数调用
**问题：** 我们知道进行函数调用的时候也需要保存调用者的状态: 返回地址, 以及calling convention中需要调用者保存的寄存器. 而CTE在保存上下文的时候却要保存更多的信息. 尝试对比它们, 并思考两者保存信息不同是什么原因造成的

**Solution**
两者保存信息的差异源于控制流转移的**性质**和**目的**不同。

#### 核心差异点
| 机制 | **函数调用 (Procedure Call)** | **异常/中断处理 (CTE)** |
| --- | --- | --- |
| **控制流** | **协作式**，基于软件约定。 | **非协作式**，硬件或软件强制介入。 |
| **特权级** | 不切换。 | **必须切换**（用户态 \rightarrow 内核态）。 |
| **保存范围** | **部分**通用寄存器（最小必需子集）。 | **全部**通用寄存器（GPRs）+ 系统状态寄存器（CSRs）。 |

#### 原因总结
1. **非协作性：** CTE 随时发生，内核无法预知哪些 GPRs 需要保留，因此必须保存**所有** GPRs，以保证被中断程序无损恢复。函数调用是软件约定好的，只需保存约定子集。
2. **特权级切换：** CTE 涉及特权级提升，必须保存 **CSRs**（如 `mstatus` 和 `mepc`）来记录和恢复 CPU 的模式和状态。
3. **目的不同：** CTE 旨在创建**完整的进程/线程快照（Context）**，这是操作系统实现**进程调度**和多任务的基础。

### 从加4操作看CISC和RISC
**问题：** 决定 EPC 是否加 4 的是硬件还是软件？CISC/RISC 方案的取舍？哪个更合理？

**Solution:**

决定 EPC 修正的责任是**硬件复杂性**与**软件灵活性**的权衡。

| 方案 | **CISC (硬件处理)** | **RISC (软件处理)** |
| --- | --- | --- |
| **机制** | 硬件自动根据异常类型修正 EPC。 | 软件（内核）根据 `mcause` 手动修正 EPC。 |
| **取舍** | **优点：** 异常处理延迟极低。 **缺点：** 硬件复杂度高，指令集（ISA）扩展性差。 | **优点：** 硬件设计简单，ISA 统一精简，OS 灵活可控。 **缺点：** 异常处理延迟略高。 |

**RISC 软件处理方案更合理。**
**理由：** 它符合 RISC 哲学，将**复杂性转移到低频发生的软件**，从而简化 CPU 核心设计，提高 CPU 频率和效率。尽管异常延迟增加，但整体系统性能和可扩展性更高。

### 如何识别不同格式的可执行文件?
**问题：** 如果你在GNU/Linux下执行一个从Windows拷过来的可执行文件, 将会报告"格式错误". 思考一下, GNU/Linux是如何知道"格式错误"的?

**Solution**

GNU/Linux 内核通过 **`execve` 系统调用**尝试加载文件时，通过校验文件头部的**魔数（Magic Number）**来识别格式。
1. **内核操作：** 当用户执行文件时，内核启动 `execve`，并读取文件开头的几个字节。
2. **魔数校验：** 内核依次检查注册的**可执行文件格式处理器（`binfmt`）**。
* Linux 原生格式是 **ELF**，其魔数为 \text{0x7FELF}。
* Windows 文件是 **PE** 格式，其头部魔数与 ELF 不匹配。
1. **识别失败：** 所有已注册的 `binfmt` 处理器（包括 `load_elf_binary`）都无法识别文件头部的魔数，导致加载失败。
2. **返回错误：** 内核返回错误码 **`ENOEXEC`**（Exec format error）。Shell 将此翻译为用户可见的“格式错误”。

## 有趣的瞬间
![menu](menu.png)

---
![仙界奇侠传(menu)1](xianjianqixiazhuan1.png)

---
![仙剑奇侠传(menu)2](xianjianqixiazhuan2.png)

---
![nterm](nterm.png)

---
![仙剑奇侠传(nterm)](xianjianqixiazhuan3.png)
## 实验心情
😊 感觉良好