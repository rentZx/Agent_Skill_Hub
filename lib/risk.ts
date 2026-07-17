import type { Resource, RiskLevel } from "./types";

export function getRiskReason(resource: Pick<Resource, "risk_level" | "risk_reason">) {
  if (resource.risk_reason) return resource.risk_reason;

  const defaults: Record<RiskLevel, string> = {
    low: "已检测到许可证、近期维护或较充分的社区信号，未发现明显高风险信号。",
    medium: "存在一定维护、许可证或社区验证不确定性，建议先在隔离环境验证。",
    high: "存在许可证缺失、长期未更新、仓库归档或社区验证不足等高风险信号，不能直接作为生产依赖。"
  };

  return defaults[resource.risk_level];
}
