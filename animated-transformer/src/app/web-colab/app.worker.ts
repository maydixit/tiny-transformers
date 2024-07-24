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

/// <reference lib="webworker" />

import * as tf from '@tensorflow/tfjs';
import { GTensor, SerializedGTensor } from 'src/lib/gtensor/gtensor';
import * as lab from '../../lib/weblab/workerlab';
import { exampleWorkerOp } from './example.ailab';

console.log('app.worker', self.location);

type InputKind = string;
type OutputKind = {
  t: SerializedGTensor<'a'>;
  v: number;
} | null;

// exampleWorkerOp;

async function run() {
  const input = await lab.onceGetInput<InputKind>('name');

  console.log(`webworker got input! ${input}`);

  const t = new GTensor(tf.tensor([1, 2, 3]), ['a']);
  const v = t.contract(t, ['a']).tensor.arraySync() as number;

  lab.output('tensor', {
    t: t.toSerialised(),
    v,
  });
}

run();
