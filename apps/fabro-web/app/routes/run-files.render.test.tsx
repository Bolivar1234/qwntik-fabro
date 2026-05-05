import { afterEach, describe, expect, mock, test } from "bun:test";
import TestRenderer, { act } from "react-test-renderer";
import { MemoryRouter, Route, Routes } from "react-router";

import { ToastProvider } from "../components/toast";

let currentFilesPayload: any = null;
let currentRunStatus = "succeeded";

const multiFileDiffCalls: any[] = [];
const patchDiffCalls: any[] = [];
const virtualizerCalls: any[] = [];
const providerCalls: any[] = [];
const mountedRenderers: TestRenderer.ReactTestRenderer[] = [];

mock.module("@pierre/diffs/react", () => ({
  MultiFileDiff: (props: any) => {
    multiFileDiffCalls.push(props);
    return <div data-pierre-multi="true">{props.newFile.name}</div>;
  },
  PatchDiff: (props: any) => {
    patchDiffCalls.push(props);
    return <div data-pierre-patch="true">{props.patch}</div>;
  },
  Virtualizer: (props: any) => {
    virtualizerCalls.push(props);
    return <div data-pierre-virtualizer="true">{props.children}</div>;
  },
  WorkerPoolContextProvider: (props: any) => {
    providerCalls.push(props);
    return <div data-pierre-worker-pool="true">{props.children}</div>;
  },
}));

mock.module("../lib/queries", () => ({
  useRun: () => ({
    data: {
      run_id:          "run_1",
      title:           "Run 1",
      repository:      { name: "fabro" },
      status:          { kind: currentRunStatus },
      workflow_slug:   "default",
      workflow_name:   "Default",
      duration_ms:     null,
      elapsed_secs:    null,
      source_directory: null,
    },
  }),
  useRunFiles: () => ({
    data:         currentFilesPayload,
    error:        null,
    isLoading:    false,
    isValidating: false,
    mutate:       mock(() => Promise.resolve(currentFilesPayload)),
  }),
  useRunQuestions: () => ({ data: [] }),
}));

const { default: RunFiles } = await import("./run-files");

function makeFiles(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const name = `src/file-${index}.ts`;
    return {
      change_kind: "modified",
      old_file:    { name, contents: `old ${index}\n` },
      new_file:    { name, contents: `new ${index}\n` },
    };
  });
}

function makePayload(count: number) {
  return {
    data: makeFiles(count),
    meta: {
      degraded:            false,
      degraded_reason:     null,
      total_changed:       count,
      stats:               { additions: count, deletions: count },
      truncated:           false,
      to_sha:              "abc1234",
      to_sha_committed_at: "2026-05-05T12:00:00Z",
    },
  };
}

function renderRunFiles() {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <ToastProvider>
        <MemoryRouter initialEntries={["/runs/run_1/files"]}>
          <Routes>
            <Route path="/runs/:id/files" element={<RunFiles />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
  });
  mountedRenderers.push(renderer!);
  return renderer!;
}

describe("RunFiles rendering", () => {
  afterEach(() => {
    act(() => {
      for (const renderer of mountedRenderers.splice(0)) {
        renderer.unmount();
      }
    });
    currentFilesPayload = null;
    currentRunStatus = "succeeded";
    multiFileDiffCalls.length = 0;
    patchDiffCalls.length = 0;
    virtualizerCalls.length = 0;
    providerCalls.length = 0;
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });

  test("renders a one-file payload through Pierre Virtualizer", () => {
    currentFilesPayload = makePayload(1);

    const renderer = renderRunFiles();

    expect(virtualizerCalls).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "data-run-file-row": "true" })).toHaveLength(1);
    expect(multiFileDiffCalls[0].options.diffStyle).toBe("split");
  });

  test("renders a 27-file payload through one Pierre Virtualizer", () => {
    currentFilesPayload = makePayload(27);

    const renderer = renderRunFiles();

    expect(virtualizerCalls).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "data-run-file-row": "true" })).toHaveLength(27);
  });

  test("passes stable Pierre cache keys across unrelated re-renders", () => {
    currentFilesPayload = makePayload(1);

    const renderer = renderRunFiles();
    const firstOldKey = multiFileDiffCalls[0].oldFile.cacheKey;
    const firstNewKey = multiFileDiffCalls[0].newFile.cacheKey;

    act(() => {
      renderer.update(
        <ToastProvider>
          <MemoryRouter initialEntries={["/runs/run_1/files"]}>
            <Routes>
              <Route path="/runs/:id/files" element={<RunFiles />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );
    });

    const lastCall = multiFileDiffCalls[multiFileDiffCalls.length - 1];
    expect(firstOldKey).toBe(lastCall.oldFile.cacheKey);
    expect(firstNewKey).toBe(lastCall.newFile.cacheKey);
    expect(firstOldKey).toContain("fabro-run-file:run_1:abc1234:old:src/file-0.ts:");
    expect(firstNewKey).toContain("fabro-run-file:run_1:abc1234:new:src/file-0.ts:");
    expect(lastCall.options).not.toHaveProperty("theme");
  });
});
