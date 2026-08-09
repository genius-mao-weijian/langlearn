/**
 * 进程内事件总线（Event Bus）
 *
 * 实现一个轻量级的发布 / 订阅（Pub/Sub）机制，用于模块间的解耦通信。
 * 例如：learning 模块在练习完成时发出 EXERCISE_COMPLETED 事件，
 * progress 模块订阅该事件并异步更新学习进度，二者无需直接调用彼此的接口。
 *
 * 【架构演进说明】
 * - P0 阶段：使用进程内事件总线（同进程派发，异步执行处理器），
 *   满足模块化单体架构下模块解耦的需求。
 * - P5 阶段：计划将其替换为分布式消息中间件（如 Redis Streams / NATS），
 *   以支持服务拆分后的跨进程 / 跨服务事件传递。
 *
 * 当前接口设计已预留演进路径：
 *   on()   对应消息订阅（subscribe）
 *   emit() 对应消息发布（publish）
 * 切换到 Redis Streams 时仅需替换内部实现，调用方代码无需改动。
 */

/**
 * 事件类型枚举
 * 集中管理所有跨模块事件名称，避免使用魔法字符串导致拼写错误
 */
export enum EventType {
  /** 用户注册成功 —— 由 identity 模块发出 */
  USER_REGISTERED = 'USER_REGISTERED',
  /** 练习完成 —— 由 learning 模块发出，progress 模块订阅 */
  EXERCISE_COMPLETED = 'EXERCISE_COMPLETED',
  /** 学习进度更新 —— 由 progress 模块发出 */
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  /** 成就解锁 —— 由 progress 模块发出，可触发通知 */
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
}

// 事件处理器类型：接收任意载荷的回调函数
type EventHandler = (payload: unknown) => void;

/**
 * EventBus 事件总线类
 * 内部使用 Map 维护「事件名 -> 处理器列表」的映射
 */
class EventBus {
  // 事件名到处理器列表的映射
  private handlers: Map<EventType, EventHandler[]> = new Map();

  /**
   * 订阅事件
   * @param event   事件类型
   * @param handler 事件处理器，事件触发时被调用
   */
  on(event: EventType, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (list) {
      list.push(handler);
    } else {
      this.handlers.set(event, [handler]);
    }
  }

  /**
   * 发布事件
   * 同步遍历所有订阅者，但使用 setImmediate 异步执行处理器，
   * 避免事件处理逻辑阻塞发布方。
   *
   * 【P5 演进】替换为消息中间件后，此处将变为网络投递，
   * 处理器在消费者侧执行，天然异步且跨进程。
   *
   * @param event   事件类型
   * @param payload 事件载荷
   */
  emit(event: EventType, payload: unknown): void {
    const list = this.handlers.get(event);
    if (!list) {
      return;
    }
    for (const handler of list) {
      // 异步执行，保证发布方不被订阅方阻塞
      setImmediate(() => {
        try {
          handler(payload);
        } catch (err) {
          // 捕获处理器异常，避免单个订阅者出错影响其他订阅者或发布方
          console.error(`[eventBus] 事件 ${event} 处理器执行异常：`, err);
        }
      });
    }
  }
}

// 导出单例实例，全应用共享同一个事件总线
export const eventBus = new EventBus();
