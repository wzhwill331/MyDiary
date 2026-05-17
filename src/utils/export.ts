import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform, View } from 'react-native';
import React from 'react';
import { DatabaseApi, normalizeBackupPayload } from '../services/database';
import { DiaryEntry, DiaryFolder } from '../types/diary';

const EXPORT_FILE_NAME = 'MyDiary_Backup.json';

// Generate HTML for a single diary entry
const generateEntryHtml = (entry: DiaryEntry, folderName?: string): string => {
  const date = new Date(entry.createdAt);
  const dateStr = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const tagsHtml = entry.tags.length > 0
    ? `<div class="tags">${entry.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  const folderHtml = folderName ? `<div class="folder">📁 ${escapeHtml(folderName)}</div>` : '';

  return `
    <div class="entry">
      <div class="entry-header">
        <h2 class="entry-title">${escapeHtml(entry.title || '无标题')}</h2>
        <span class="entry-date">${dateStr}</span>
      </div>
      ${folderHtml}
      <div class="entry-content">${escapeHtml(entry.content || '').replace(/\n/g, '<br/>')}</div>
      ${tagsHtml}
    </div>`;
};

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Generate full HTML page for all entries
const generateFullHtml = (entries: DiaryEntry[], folders: DiaryFolder[]): string => {
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));
  const now = new Date();
  const exportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const entriesHtml = entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((e) => generateEntryHtml(e, e.folderId ? folderMap.get(e.folderId) : undefined))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyDiary 备份 - ${exportDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: #f5f5f7;
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #222;
      margin: 30px 0;
      font-size: 28px;
    }
    .meta {
      text-align: center;
      color: #888;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .entry {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
    }
    .entry-title {
      font-size: 20px;
      font-weight: 700;
      color: #222;
    }
    .entry-date {
      font-size: 13px;
      color: #999;
      white-space: nowrap;
      margin-left: 12px;
    }
    .folder {
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }
    .entry-content {
      font-size: 15px;
      line-height: 1.7;
      color: #444;
      margin-bottom: 12px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      background: #eef1f4;
      border-radius: 5px;
      padding: 3px 10px;
      font-size: 12px;
      color: #555;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .entry { box-shadow: none; border: 1px solid #eee; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>📖 我的日记</h1>
  <div class="meta">导出于 ${exportDate} · 共 ${entries.length} 篇</div>
  ${entriesHtml}
</body>
</html>`;
};

export const exportDiaryEntriesToJson = async (database: DatabaseApi) => {
  try {
    const backup = await database.exportEntries();
    const jsonString = JSON.stringify(backup, null, 2);
    const file = new File(Paths.document, EXPORT_FILE_NAME);

    if (!file.exists) {
      file.create({ intermediates: true });
    }
    file.write(jsonString);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: '导出 MyDiary 备份',
      });
      Alert.alert('导出成功', `已导出 ${backup.entries.length} 篇日记。`);
    } else {
      Alert.alert('导出成功', `已导出到：${file.uri}`);
    }
  } catch (error) {
    console.error('Failed to export diary entries', error);
    Alert.alert('导出失败', '导出日记时发生错误。');
  }
};

export const exportDiaryEntriesToHtml = async (database: DatabaseApi) => {
  try {
    const backup = await database.exportEntries();
    const html = generateFullHtml(backup.entries, backup.folders);
    const file = new File(Paths.document, 'MyDiary_Export.html');

    if (!file.exists) {
      file.create({ intermediates: true });
    }
    file.write(html);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/html',
        UTI: 'public.html',
        dialogTitle: '导出日记为网页',
      });
    } else {
      Alert.alert('导出成功', `已导出到：${file.uri}`);
    }
  } catch (error) {
    console.error('Failed to export diary entries as HTML', error);
    Alert.alert('导出失败', '导出日记时发生错误。');
  }
};

export const exportSingleEntryToHtml = async (entry: DiaryEntry, folderName?: string) => {
  try {
    const html = generateFullHtml([entry], []);
    const fileName = `MyDiary_${(entry.title || '无标题').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.html`;
    const file = new File(Paths.document, fileName);

    if (!file.exists) {
      file.create({ intermediates: true });
    }
    file.write(html);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/html',
        UTI: 'public.html',
        dialogTitle: '分享日记',
      });
    }
  } catch (error) {
    console.error('Failed to export single entry', error);
    Alert.alert('导出失败', '导出日记时发生错误。');
  }
};

export const importDiaryEntriesFromJson = async (database: DatabaseApi) => {
  try {
    const pickedFile = await File.pickFileAsync(undefined, 'application/json');
    const file = Array.isArray(pickedFile) ? pickedFile[0] : pickedFile;

    if (!file) return;

    const rawContent = await file.text();
    const payload = JSON.parse(rawContent) as unknown;
    const { entries, folders } = normalizeBackupPayload(payload);

    if (entries.length === 0 && folders.length === 0) {
      Alert.alert('导入失败', '没有找到可导入的日记。');
      return;
    }

    const result = await database.importEntries(entries, folders);
    const parts = [`新增 ${result.added} 篇`, `更新 ${result.updated} 篇`, `跳过 ${result.skipped} 篇`];
    if (result.foldersAdded > 0) parts.push(`新增 ${result.foldersAdded} 个日记夹`);
    Alert.alert('导入完成', parts.join('，') + '。');
  } catch (error) {
    console.error('Failed to import diary entries', error);
    Alert.alert('导入失败', '导入日记时发生错误，请确认文件是有效的 JSON 备份。');
  }
};

// Image export using react-native-view-shot
export const captureDiaryCardAsImage = async (cardRef: React.RefObject<View>) => {
  try {
    const { captureRef } = await import('react-native-view-shot');
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
    });
    return uri;
  } catch (error) {
    console.error('Failed to capture diary card', error);
    throw error;
  }
};

export const shareDiaryAsImage = async (cardRef: React.RefObject<View>) => {
  try {
    const uri = await captureDiaryCardAsImage(cardRef);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: '分享日记图片',
      });
    } else {
      Alert.alert('导出成功', `图片已保存到：${uri}`);
    }
  } catch (error) {
    console.error('Failed to share diary as image', error);
    Alert.alert('导出失败', '导出图片时发生错误。');
  }
};

export const saveDiaryImageToAlbum = async (cardRef: React.RefObject<View>) => {
  try {
    const { captureRef } = await import('react-native-view-shot');
    const MediaLibrary = await import('expo-media-library');

    // Request permission
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能保存图片。');
      return;
    }

    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
    });

    const asset = await MediaLibrary.createAssetAsync(uri);
    Alert.alert('保存成功', '日记图片已保存到相册！');
    return asset;
  } catch (error) {
    console.error('Failed to save image to album', error);
    Alert.alert('保存失败', '保存图片时发生错误。');
  }
};
