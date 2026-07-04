"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, Trash2, Download, Image as ImageIcon } from "lucide-react";
import { PageHeader, Card, Button, EmptyState, Badge } from "../../_components/ui";
import { useFiles, useStorageUsage, useUploadFile, useDeleteFile, fileDownloadUrl } from "../../../../lib/hooks/use-files";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function FilesPage() {
  const { data: files, isLoading } = useFiles();
  const { data: usage } = useStorageUsage();
  const upload = useUploadFile();
  const remove = useDeleteFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    try {
      await upload.mutateAsync({ file: fileList[0]! });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const usagePct = usage?.quotaBytes ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Files" description="Documents, imports, and other uploads shared across your organization." />

      {usage && (
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Storage used</span>
            <span className="text-slate-500">
              {formatBytes(usage.usedBytes)} {usage.quotaBytes ? `of ${formatBytes(usage.quotaBytes)}` : "· unlimited"}
              {" · "}
              <Badge tone="brand">{usage.plan}</Badge>
            </span>
          </div>
          {usage.quotaBytes && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${usagePct > 90 ? "bg-red-500" : "bg-brand-600"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </Card>
      )}

      <Card
        className={`flex flex-col items-center justify-center border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-brand-400 bg-brand-50/50" : "border-slate-200"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="text-slate-400" size={28} />
        <p className="mt-2 text-sm font-medium text-slate-700">Drag and drop a file, or</p>
        <Button variant="secondary" className="mt-3" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? "Uploading..." : "Browse files"}
        </Button>
        <input ref={inputRef} type="file" hidden onChange={(e) => handleFiles(e.target.files)} />
        <p className="mt-2 text-xs text-slate-400">Images, PDFs, CSV, XLSX, DOCX — up to 50MB</p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Card>

      <Card>
        {isLoading && <p className="px-4 py-8 text-center text-sm text-slate-400">Loading...</p>}
        {!isLoading && files?.length === 0 && <EmptyState title="No files yet" description="Uploaded files will appear here." />}
        {files && files.length > 0 && (
          <ul className="divide-y divide-slate-50">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {f.mimeType.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{f.originalName}</p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {f.status === "PENDING" ? (
                  <Badge tone="amber">Processing</Badge>
                ) : (
                  <a
                    href={fileDownloadUrl(f.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    title="Download"
                  >
                    <Download size={15} />
                  </a>
                )}
                <button
                  onClick={() => remove.mutate(f.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
