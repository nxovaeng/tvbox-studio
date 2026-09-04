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
      // 自动迁移旧格式
      const migrated = new Map<string, ConfigCard>();
      for (const item of data) {
        if (item.projectName && Array.isArray(item.configs)) {
          migrated.set(item.projectName, item);
          continue;
        }
        
        // Old item migration
        let p = item.path || (item.url ? item.url.replace("file://", "") : "");
        p = p.replace(/\\/g, "/");
        if (p) {
          const parts = p.split("/");
          const fileName = parts.pop() || "tvbox.json";
          const projName = parts.pop() || "default";
          
          if (!migrated.has(projName)) {
            migrated.set(projName, {
              id: projName,
              projectName: projName,
              defaultConfig: fileName,
              configs: [fileName],
              updatedAt: item.updatedAt || Date.now(),
              sites: item.sites,
              lives: item.lives,
              parses: item.parses,
              spider: item.spider,
              description: item.description,
              tags: item.tags,
              favorite: item.favorite,
            });
          } else {
             const exist = migrated.get(projName)!;
             if (!exist.configs.includes(fileName)) {
               exist.configs.push(fileName);
             }
             if (item.updatedAt > exist.updatedAt) {
               exist.updatedAt = item.updatedAt;
               exist.sites = item.sites;
               exist.lives = item.lives;
               exist.parses = item.parses;
               exist.spider = item.spider;
               exist.defaultConfig = fileName;
             }
          }
        }
      }
      return Array.from(migrated.values());
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
  currentCards.forEach((c) => mergedMap.set(c.projectName, c));
  recordCards.forEach((c) => {
    mergedMap.set(c.projectName, { ...mergedMap.get(c.projectName), ...c });
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
        const jsonFiles = subFiles.filter(f => !f.is_dir && f.name.endsWith(".json") && f.name !== "configs.json");
        
        if (jsonFiles.length === 0) continue;
        
        const configs = jsonFiles.map(f => f.name);
        
        let existing = mergedMap.get(subDirName);
        if (!existing) {
           existing = {
             id: subDirName,
             projectName: subDirName,
             defaultConfig: configs.includes("tvbox.json") ? "tvbox.json" : configs[0],
             configs,
             updatedAt: 0
           };
           mergedMap.set(subDirName, existing);
        } else {
           existing.configs = Array.from(new Set([...existing.configs, ...configs]));
           if (!existing.configs.includes(existing.defaultConfig)) {
             existing.defaultConfig = existing.configs.includes("tvbox.json") ? "tvbox.json" : existing.configs[0];
           }
        }
        
        // Parse the default config to get latest stats
        const defFile = jsonFiles.find(f => f.name === existing!.defaultConfig) || jsonFiles[0];
        try {
           const content = await readFile(defFile.path);
           const json = JSON.parse(content);
           existing.sites = json.sites?.length ?? 0;
           existing.lives = json.lives?.length ?? 0;
           existing.parses = json.parses?.length ?? 0;
           existing.spider = json.spider;
           existing.updatedAt = defFile.modified ? defFile.modified * 1000 : Date.now();
        } catch {}
      } catch {}
    }
  } catch {}

  const resultCards = Array.from(mergedMap.values());
  if (resultCards.length > 0) {
    await writeConfigsRecord(root, resultCards);
  }
  return resultCards;
}

