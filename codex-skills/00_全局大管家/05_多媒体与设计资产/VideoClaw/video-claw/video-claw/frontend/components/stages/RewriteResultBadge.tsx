'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface RewriteResult {
  stage?: string;
  model?: string;
  error?: string;
  original_prompt?: string;
  optimized_prompt?: string;
  doctor_reason_type?: string;
  doctor_reason?: string;
  confidence?: number;
}

function hasRewriteResult(result?: RewriteResult | null): result is RewriteResult {
  return Boolean(result && Object.keys(result).length > 0);
}

function PromptPanel({ title, text }: { title: string; text?: string }) {
  return (
    <div className="min-h-[260px] rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">{title}</div>
      <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-600 custom-scrollbar">
        {text || '无'}
      </pre>
    </div>
  );
}

export default function RewriteResultBadge({ rewriteResult }: { rewriteResult?: RewriteResult | null }) {
  const [open, setOpen] = useState(false);
  if (!hasRewriteResult(rewriteResult)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
        title="查看提示词自动优化记录"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">提示词自动优化记录</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  Doctor Agent 已判断该错误可通过重写提示词处理
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <PromptPanel title="原提示词" text={rewriteResult.original_prompt} />
                <PromptPanel title="优化后提示词" text={rewriteResult.optimized_prompt} />
              </div>
              <div className="grid gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-gray-700 md:grid-cols-2">
                <div>
                  <span className="font-semibold text-gray-900">doctor_reason_type：</span>
                  <span>{rewriteResult.doctor_reason_type || 'unknown'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">model：</span>
                  <span>{rewriteResult.model || '无'}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-900">doctor_reason：</span>
                  <span>{rewriteResult.doctor_reason || '无'}</span>
                </div>
                {rewriteResult.error && (
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-900">error：</span>
                    <span className="break-words">{rewriteResult.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
