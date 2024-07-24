/* Copyright 2023 Google LLC. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import { SerializedGTensor } from 'src/lib/gtensor/gtensor';
import * as json5 from 'json5';
import { WorkerOp } from './worker-op';
import { FromWorkerMessage } from 'src/lib/weblab/messages';

export type ItemMetaData = {
  timestamp: Date;
};

// TODO: maybe define a special type of serializable
// object that includes things with a toSerialise function?

export class WorkerEnv<Globals extends { [key: string]: any }> {
  inputFileHandles: Map<keyof Globals, FileSystemFileHandle> = new Map();
  inputFiles: Map<keyof Globals, FileSystemFileHandle> = new Map();
  state: Partial<Globals> = {};
  metadata: Map<keyof Globals, ItemMetaData> = new Map();

  constructor(public workingDir: FileSystemDirectoryHandle) {}

  // having to add string here to avoid Typescript bug.
  async loadValueFromFile<Key extends keyof Globals & string>(
    inputFileName: Key
  ): Promise<Globals[Key]> {
    const fileHandle = await this.workingDir.getFileHandle(inputFileName);
    const file = await fileHandle.getFile();
    const dec = new TextDecoder('utf-8');
    const json = dec.decode(await file.arrayBuffer());
    let obj: Globals[Key];
    try {
      obj = json5.parse(json);
    } catch (e: unknown) {
      // Remark: Why don't errors come in trees, so one can provide
      // context in try/catch blocks?
      console.error(`Failed to parse ${inputFileName}.`);
      throw e;
    }
    // TODO: introduce concept of escaping & object registry.
    return obj;
  }

  async run<I extends keyof Globals & string, O extends keyof Globals & string>(
    op: WorkerOp<I, O>
  ): Promise<{ [key in O]: Globals[O] }> {
    const outputs = {} as { [key in O]: Globals[O] };
    // Ensure inputs in memory.
    for (const inputName of op.api.inputs) {
      if (this.state[inputName] === undefined) {
        const inputValue = await this.loadValueFromFile(inputName);
        this.state[inputName] = inputValue;
      }
    }

    const worker = new Worker(new URL(op.workerPath, import.meta.url));
    worker.onmessage = ({ data }) => {
      const messageFromWorker = data as FromWorkerMessage;
      switch (messageFromWorker.kind) {
        case 'finished':
          worker.terminate();
          break;
        case 'requestInput':
          break;
        case 'providingOutput':
          break;
        default:
          console.error('unknown worker message: ', data);
          break;
      }
    };

    // worker.onmessage(() => {});

    return outputs;
  }
}
