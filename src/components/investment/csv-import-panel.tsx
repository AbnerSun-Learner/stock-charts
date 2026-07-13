'use client';

import { useState } from 'react';
import { Alert, Button, Card, Space, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  parsePositionCsv,
  parseTradeCsv,
  stableHash,
} from '@/lib/investment/csv-import';
import type { InvestmentRepository } from '@/lib/supabase/investment-repository';

export interface CsvImportPanelProps {
  repository: InvestmentRepository;
  onImported: () => Promise<void>;
}

/**
 * 导入成交 / 持仓快照；整批写入走 RPC（§4.5 未就绪时明确失败）。
 */
export function CsvImportPanel({
  repository,
  onImported,
}: CsvImportPanelProps) {
  const [tradeFile, setTradeFile] = useState<UploadFile | null>(null);
  const [positionFile, setPositionFile] = useState<UploadFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [rpcBlocked, setRpcBlocked] = useState(false);
  const [previewIssues, setPreviewIssues] = useState<string[]>([]);

  const readFileText = (file: UploadFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const raw = file.originFileObj;
      if (!raw) {
        reject(new Error('未找到文件内容'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(raw);
    });

  const onImport = async () => {
    if (!tradeFile && !positionFile) {
      message.warning('请至少选择一个 CSV 文件');
      return;
    }
    setImporting(true);
    setPreviewIssues([]);
    try {
      const batchId = crypto.randomUUID();
      let tradesText = '';
      let positionsText = '';
      if (tradeFile) {
        tradesText = await readFileText(tradeFile);
      }
      if (positionFile) {
        positionsText = await readFileText(positionFile);
      }

      const tradeParsed = tradeFile
        ? parseTradeCsv({
            csvText: tradesText,
            importBatchId: batchId,
            defaultCurrency: 'CNY',
          })
        : { trades: [], discardedFeeFlows: [], issues: [] };
      const positionParsed = positionFile
        ? parsePositionCsv({
            csvText: positionsText,
            importBatchId: batchId,
          })
        : { positions: [], issues: [] };

      const issues = [
        ...tradeParsed.issues.map(
          issue => `成交: ${issue.message}${issue.rowNumber ? ` (行 ${issue.rowNumber})` : ''}`
        ),
        ...positionParsed.issues.map(
          issue => `持仓: ${issue.message}${issue.rowNumber ? ` (行 ${issue.rowNumber})` : ''}`
        ),
      ];
      setPreviewIssues(issues);

      if (tradeParsed.trades.length === 0 && positionParsed.positions.length === 0) {
        message.error('没有可导入的有效行');
        setImporting(false);
        return;
      }

      const sourceName = [tradeFile?.name, positionFile?.name]
        .filter(Boolean)
        .join('+');
      const sourceHash = stableHash(`${tradesText}\n${positionsText}`);

      const result = await repository.importLedgerBatch({
        sourceFileName: sourceName || 'import.csv',
        sourceFileHash: sourceHash,
        trades: tradeParsed.trades,
        cashFlows: [],
        positions: positionParsed.positions,
      });

      if (!result.ok) {
        if (result.error === 'rpc_unavailable') {
          setRpcBlocked(true);
        }
        message.error(result.message);
        setImporting(false);
        return;
      }

      setRpcBlocked(false);
      if (result.value.issues.length > 0) {
        message.warning(
          `导入完成，但有 ${result.value.issues.length} 条费税去重提示`
        );
      } else {
        message.success(`导入成功，批次 ${result.value.importBatchId}`);
      }
      await onImported();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    }
    setImporting(false);
  };

  return (
    <Card title="CSV 导入">
      {rpcBlocked ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          message="import_ledger_batch 尚未就绪（§4.5）。禁止用浏览器逐行 insert 冒充整批事务。"
        />
      ) : (
        <Alert
          className="mb-4"
          type="info"
          showIcon
          message="成交/持仓 CSV 导入后整批提交；汇率以只读 fx_rates 为主。导入持仓不会覆盖目标配置。"
        />
      )}
      <Space direction="vertical" className="w-full" size="middle">
        <div>
          <div className="mb-2 text-sm text-[var(--text-secondary)]">
            成交 CSV（列：tradeDate,instrumentId,side,price,quantity,currency…）
          </div>
          <Upload
            accept=".csv,text/csv"
            maxCount={1}
            beforeUpload={() => false}
            onChange={({ fileList }) => setTradeFile(fileList[0] ?? null)}
          >
            <Button>选择成交文件</Button>
          </Upload>
        </div>
        <div>
          <div className="mb-2 text-sm text-[var(--text-secondary)]">
            持仓快照 CSV（列：asOfDate,instrumentId,shares,averageCost,currency…）
          </div>
          <Upload
            accept=".csv,text/csv"
            maxCount={1}
            beforeUpload={() => false}
            onChange={({ fileList }) => setPositionFile(fileList[0] ?? null)}
          >
            <Button>选择持仓文件</Button>
          </Upload>
        </div>
        <Button type="primary" loading={importing} onClick={onImport}>
          解析并整批导入
        </Button>
        {previewIssues.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="解析问题"
            description={
              <ul className="mb-0 pl-4">
                {previewIssues.map(issue => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            }
          />
        ) : null}
      </Space>
    </Card>
  );
}
