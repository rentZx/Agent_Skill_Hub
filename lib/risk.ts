import type { Resource, RiskLevel } from "./types";

type RiskResource = Pick<
  Resource,
  "risk_level" | "risk_reason" | "license" | "latest_commit_at" | "github_stars"
>;

export function getRiskReason(resource: RiskResource) {
  const hasRepositorySignals = Boolean(
    resource.license ||
    resource.latest_commit_at ||
    typeof resource.github_stars === "number"
  );

  if (hasRepositorySignals) {
    const evidence: string[] = [
      resource.license
        ? `许可证：${resource.license}`
        : "许可证：未检测到明确的 SPDX 许可证"
    ];
    const warnings: string[] = [];
    warnings.push(...getSpecificRiskSignals(resource.risk_reason));
    const latestCommit = resource.latest_commit_at ? new Date(resource.latest_commit_at) : null;
    const latestCommitTime = latestCommit && !Number.isNaN(latestCommit.getTime()) ? latestCommit.getTime() : 0;
    const staleDays = latestCommitTime ? (Date.now() - latestCommitTime) / 86400000 : Number.POSITIVE_INFINITY;

    if (latestCommitTime && latestCommit) {
      evidence.push(`最近维护：${formatDate(latestCommit)}`);
      if (staleDays > 540) warnings.push("最近维护已超过 18 个月");
      else if (staleDays > 240) warnings.push("最近维护已超过 8 个月");
    } else {
      warnings.push("没有可验证的最近维护时间");
    }

    if (typeof resource.github_stars === "number") {
      evidence.push(`GitHub Stars：${resource.github_stars}`);
      if (resource.github_stars < 50) warnings.push("Stars 少于 50，社区验证较少");
    }

    if (!resource.license) warnings.push("缺少明确许可证，使用和分发边界不清晰");

    if (warnings.length > 0) {
      return `${evidence.join("；")}。风险信号：${Array.from(new Set(warnings)).join("；")}。`;
    }

    return `${evidence.join("；")}。未命中许可证缺失、长期停更或社区验证不足等主要风险条件。`;
  }

  if (resource.risk_reason) return resource.risk_reason;

  const defaults: Record<RiskLevel, string> = {
    low: "当前记录未提供完整仓库信号，现有人工审核结果为低风险。",
    medium: "当前记录的维护、许可证或社区验证信息不完整，建议先在隔离环境验证。",
    high: "当前记录被标记为高风险，但缺少完整仓库信号，不能直接作为生产依赖。"
  };

  return defaults[resource.risk_level];
}

function formatDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSpecificRiskSignals(reason?: string) {
  if (!reason) return [];

  const genericRepositorySignals = [
    "未检测到明确的 SPDX 许可证",
    "没有可验证的最近提交时间",
    "最近提交超过 18 个月，维护活跃度较低",
    "最近提交超过 8 个月，维护频率需要复核",
    "GitHub Stars 少于 50，社区验证较少",
    "已检测到许可证、近期维护和社区活跃度信号"
  ];

  return reason
    .replace(/[。]+$/g, "")
    .split("；")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !genericRepositorySignals.includes(item));
}
