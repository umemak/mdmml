import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Music,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  MeasureValidationReport,
  MeasureCellValidation,
} from '../utils/measureValidator';

interface MeasureValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MeasureValidationReport | null;
  onJumpToMeasure?: (measureNumber: number) => void;
}

export const MeasureValidationModal: React.FC<MeasureValidationModalProps> = ({
  isOpen,
  onClose,
  report,
  onJumpToMeasure,
}) => {
  const [selectedCell, setSelectedCell] = useState<MeasureCellValidation | null>(null);

  if (!isOpen || !report) return null;

  const {
    timeSignature,
    expectedBeatsPerMeasure,
    totalMeasures,
    partNames,
    matrix,
    errorCells,
    hasErrors,
  } = report;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hasErrors
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {hasErrors ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base flex items-center space-x-2">
                <span>各パートの小節内長さチェック</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  基準拍子: {timeSignature} ({expectedBeatsPerMeasure}拍)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                同一小節（列）内で各パートの長さが一致しているかを検証します。全パートで長さが揃っていれば、弱起（アウフタクト）やまとめ小節も正常として扱われます。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 診断ステータスカード */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            hasErrors
              ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {hasErrors ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div className="text-xs">
              {hasErrors ? (
                <div>
                  <p className="font-semibold text-amber-300 text-sm">
                    {errorCells.length} 箇所でパート間の長さの不一致が見つかりました
                  </p>
                  <p className="text-amber-400/80 mt-0.5">
                    同一小節内でパートごとの拍数が異なると、演奏時にトラック同士のタイミングがズレてしまいます。
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-emerald-300 text-sm">
                    すべての小節でパート間の長さが一致しています！
                  </p>
                  <p className="text-emerald-400/80 mt-0.5">
                    全 {totalMeasures} 小節において各トラックのタイミングが正確に揃っています。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 text-xs font-mono">
            <span className="text-slate-400">小節数: </span>
            <strong className="text-white">{totalMeasures}</strong>
            <span className="mx-2 text-slate-600">|</span>
            <span className="text-slate-400">パート数: </span>
            <strong className="text-white">{partNames.length}</strong>
          </div>
        </div>

        {/* マトリクス表示（小節グリッド） */}
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-medium flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>小節 × パート 診断マトリクス</span>
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/60 inline-block" />
                <span>基準拍子一致 ({expectedBeatsPerMeasure}拍)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500/30 border border-cyan-500/60 inline-block" />
                <span>パート間一致 (弱起・変拍子OK)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/70 inline-block" />
                <span>パート間不一致 (エラー)</span>
              </span>
            </div>
          </div>

          {/* グリッドテーブル */}
          <div className="flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-950/60 p-2 scrollbar-thin">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="p-2 text-left bg-slate-900/80 sticky left-0 z-10 min-w-[90px]">
                    Part
                  </th>
                  {Array.from({ length: totalMeasures }, (_, i) => i + 1).map((m) => (
                    <th
                      key={m}
                      className="p-1.5 text-center min-w-[54px] hover:text-indigo-300 cursor-pointer"
                      onClick={() => onJumpToMeasure && onJumpToMeasure(m)}
                      title={`クリックして第 ${m} 小節へジャンプ`}
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {partNames.map((pName) => {
                  const partRow = matrix.get(pName);
                  return (
                    <tr key={pName} className="hover:bg-slate-900/40 transition">
                      <td className="p-2 font-medium text-slate-200 bg-slate-900/80 sticky left-0 z-10 truncate max-w-[120px] border-r border-slate-800/80">
                        {pName}
                      </td>
                      {Array.from({ length: totalMeasures }, (_, i) => i + 1).map((m) => {
                        const cell = partRow?.get(m);
                        if (!cell) {
                          return (
                            <td key={m} className="p-1 text-center text-slate-600 font-mono text-[11px]">
                              -
                            </td>
                          );
                        }

                        let bgClass = 'bg-slate-900/40 text-slate-400 border-slate-800/60';
                        if (cell.status === 'ok') {
                          bgClass = 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40 hover:bg-emerald-900/40';
                        } else if (cell.status === 'matched') {
                          bgClass = 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/40';
                        } else if (cell.status === 'mismatch') {
                          bgClass = 'bg-rose-950/60 text-rose-300 border-rose-600 font-bold hover:bg-rose-900/60 ring-1 ring-rose-500/40';
                        } else if (cell.status === 'empty') {
                          bgClass = 'bg-slate-950 text-slate-600 border-slate-800';
                        }

                        const isSelected = selectedCell?.partName === pName && selectedCell?.measureNumber === m;

                        return (
                          <td key={m} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCell(cell)}
                              className={`w-full py-1 px-1 rounded border text-[11px] font-mono transition cursor-pointer ${bgClass} ${
                                isSelected ? 'ring-2 ring-indigo-400 shadow-sm' : ''
                              }`}
                              title={`[${pName}] 第 ${m} 小節: ${cell.actualBeats}拍 (${cell.detailMessage})`}
                            >
                              {cell.actualBeats}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 選択したセル、またはエラー一覧の詳細表示 */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-2 shrink-0">
          {selectedCell ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200">
                    [{selectedCell.partName}] 第 {selectedCell.measureNumber} 小節
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      selectedCell.status === 'ok'
                        ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                        : selectedCell.status === 'matched'
                        ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                        : selectedCell.status === 'mismatch'
                        ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {selectedCell.status === 'ok'
                      ? `基準拍子と一致 (${selectedCell.actualBeats}拍)`
                      : selectedCell.status === 'matched'
                      ? `パート間一致 (全パート ${selectedCell.actualBeats}拍)`
                      : selectedCell.status === 'mismatch'
                      ? `不一致: ${selectedCell.detailMessage}`
                      : '音符なし'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
                  <span>MML:</span>
                  <code className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-indigo-300">
                    {selectedCell.mml || '(空)'}
                  </code>
                  <span>
                    ({selectedCell.actualBeats} 拍 / 代表: {selectedCell.expectedBeats} 拍)
                  </span>
                </div>
              </div>

              {onJumpToMeasure && (
                <button
                  onClick={() => onJumpToMeasure(selectedCell.measureNumber)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <span>この小節を再生</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : errorCells.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>パート間不一致のある小節（マス目をクリックすると詳細を確認できます）:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {errorCells.slice(0, 10).map((err, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCell(err)}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-400 text-[11px] font-mono flex items-center space-x-1 cursor-pointer"
                  >
                    <span className="text-indigo-300">[{err.partName}]</span>
                    <span>M{err.measureNumber}:</span>
                    <span className="text-rose-400 font-bold">
                      {err.diffBeats > 0 ? `+${err.diffBeats}` : err.diffBeats}拍
                    </span>
                  </button>
                ))}
                {errorCells.length > 10 && (
                  <span className="text-[11px] text-slate-500 px-1 py-0.5">
                    他 {errorCells.length - 10} 件...
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-slate-400 text-xs">
              <Music className="w-4 h-4 text-emerald-400" />
              <span>上のマス目をクリックすると、そのセルのMML内容と拍数の詳細が表示されます。</span>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
