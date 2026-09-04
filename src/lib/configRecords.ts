import { readFile, writeFile, listDir, type FileEntry } from "./tauri";
import type { ConfigCard } from "../store";

/**
 * 获取多配置记录文件在数据根目录下的路径
 */
export function getConfigsRecordPath(rootSaveDir?: string): string {
  const root = (rootSaveDir || "./box").replace(/\/+$/, "");
  return `${root}/configs.json`;
}

/**
 * 从数据根目录读取 configs.json 多配置记录
 */
export async function readConfigsRecord(rootSaveDir?: string): Promise<ConfigCard[]> {
  const filePath = getConfigsRecordPath(rootSaveDir);
  try {
    const text = await readFile(filePath);
    if (!text || !text.trim()) return [];
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
  } catch {
    // 文件不存在或非标准JSON，静默忽略
  }
  return [];
}

/**
 * 将多配置记录数组写入数据根目录的 configs.json
 */
export async function writeConfigsRecord(
  rootSaveDir: string | undefined,
  cards: ConfigCard[]
): Promise<boolean> {
  const filePath = getConfigsRecordPath(rootSaveDir);
  try {
    const jsonStr = JSON.stringify(cards, null, 2);
    await writeFile(filePath, jsonStr);
    return true;
  } catch (err) {
    console.error(`保存多配置记录文件到 ${filePath} 失败:`, err);
    return false;
  }
}

/**
 * 扫描数据根目录下的子目录，自动发现所有独立配置文件并同步更新 configs.json
 */
export async function scanAndSyncConfigsRecord(
  rootSaveDir: string | undefined,
  currentCards: ConfigCard[]
): Promise<ConfigCard[]> {
  const root = (rootSaveDir || "./box").replace(/\/+$/, "");
  const recordCards = await readConfigsRecord(root);

  // 合并已持久化记录和当前内存卡片
  const mergedMap = new Map<string, ConfigCard>();
  currentCards.forEach((c) => mergedMap.set(c.path || c.id, c));
  recordCards.forEach((c) => {
    const key = c.path || c.id;
    mergedMap.set(key, { ...mergedMap.get(key), ...c });
  });

  // 扫描数据根目录下的各个子目录
  try {
    const entries: FileEntry[] = await listDir(root);
    for (const entry of entries) {
      if (!entry.is_dir) continue;
      const subDirName = entry.name;
      if (subDirName.startsWith(".") || subDirName === "node_modules") continue;

      try {
        const subFiles = await listDir(entry.path);
        for (const file of subFiles) {
          if (file.is_dir || !file.name.endsWith(".json")) continue;
          if (file.name === "configs.json") continue;

          const configPath = `${root}/${subDirName}/${file.name}`;
          const existing = Array.from(mergedMap.values()).find(
            (c) => c.path === configPath || c.path === file.path
          );

          if (!existing) {
            let sitesCount = 0;
            let livesCount = 0;
            let parsesCount = 0;
            let spider: string | undefined;
            let configName = file.name.replace(/\.json$/, "");
            if (configName === "tvbox" || configName === "config") {
              configName = subDirName;
            }

            try {
              const content = await readFile(file.path);
              const json = JSON.parse(content);
              sitesCount = json.sites?.length ?? 0;
              livesCount = json.lives?.length ?? 0;
              parsesCount = json.parses?.length ?? 0;
              spider = json.spider;
              if (json.name) configName = json.name;
            } catch {}

            const newCard: ConfigCard = {
              id: `${subDirName}_${Date.now()}`,
              name: configName,
              path: configPath,
              url: `file://${configPath}`,
              updatedAt: file.modified ? file.modified * 1000 : Date.now(),
              sites: sitesCount,
              lives: livesCount,
              parses: parsesCount,
              spider,
            };
            mergedMap.set(configPath, newCard);
          }
        }
      } catch {}
    }
  } catch {}

  const resultCards = Array.from(mergedMap.values());
  if (resultCards.length > 0) {
    await writeConfigsRecord(root, resultCards);
  }
  return resultCards;
}

