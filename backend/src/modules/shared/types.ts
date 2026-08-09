/**
 * 跨模块共享的类型定义
 *
 * 此文件集中声明各业务模块间通用的类型，避免循环依赖和类型分散。
 * 模块内部的私有类型应放在各自模块目录下。
 */
import type { Request } from 'express';

/**
 * 用户 ID 类型（branded type / 品牌类型）
 * 使用交叉类型 & { readonly __brand: 'UserId' } 做品牌标记，
 * 防止普通 string 被误当作 UserId 使用，必须显式断言才能转换。
 * 这能在编译期捕获「把任意字符串当用户 ID」的潜在错误。
 */
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * 基础事件接口
 * 所有跨模块事件都应遵循此结构，便于统一处理与日志记录。
 * 泛型 T 指定具体事件载荷的结构。
 */
export interface BaseEvent<T = unknown> {
  /** 事件名称，对应 EventType 枚举值 */
  readonly name: string;
  /** 事件发生时间（ISO 8601 字符串） */
  readonly timestamp: string;
  /** 事件载荷 */
  readonly payload: T;
}

/**
 * 已认证请求接口
 * 扩展 Express 的 Request，附加解密 JWT 后注入的 userId。
 * JWT 中间件校验通过后会挂载此字段，下游处理器据此识别当前用户。
 */
export interface AuthenticatedRequest extends Request {
  /** 当前登录用户 ID，未鉴权时为 undefined */
  userId?: UserId;
}

// ===== 模块间共享的 DTO 类型 =====

/**
 * 统一 API 响应结构
 * 前端可据此统一处理成功 / 失败响应
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码：0 表示成功，非 0 表示业务错误 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 响应数据 */
  data: T;
}

/**
 * 统一错误响应结构
 */
export interface ApiError {
  /** HTTP 状态码 */
  statusCode: number;
  /** 错误信息 */
  message: string;
  /** 字段级错误（如表单校验），可选 */
  details?: Record<string, string>;
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  /** 当前页数据 */
  items: T[];
  /** 总条数 */
  total: number;
  /** 当前页码（从 1 开始） */
  page: number;
  /** 每页条数 */
  pageSize: number;
}
