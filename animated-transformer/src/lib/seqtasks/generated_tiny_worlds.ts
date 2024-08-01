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

/* Generated Tiny Worlds */

import * as tf from '@tensorflow/tfjs';
import { TinyWorldTaskConfig, TinyWorldTask } from './tiny_worlds';
import { makeRandomStream } from '../state-iter/random';

export const defaultNGramTinyWorldConfig: TinyWorldTaskConfig = {
  name: 'Generated N-Gram Tiny World',
  seed: 42,
  maxInputLen: 10,
  maxOutputLen: 20,
  typeHierarchy: {},
  relationKinds: {
    is: [''],
  },
  baseContext: [],
  rules: [],
  maxEntityLimit: 6,
};

export function getUniGramTinyWorldConfig(
  nIdentity: number,
  seed: number = 0
) {
  function getIdentity(index: number) {
    return 'i' + String(index);
  }

  let randomStream = makeRandomStream(seed);
  const typeHierarchy = {
    t0: [...Array(nIdentity).keys()].map(getIdentity),
  };

  let rules: string[] = [];

  for (let indexIdentity = 0; indexIdentity < nIdentity; indexIdentity += 1) {
    let value = randomStream.uniformIntInRange(0, 100);
    let rule = `S(is ?x:${getIdentity(indexIdentity)}) += ${value}`;
    rules.push(rule);
  }

  const resultConfig: TinyWorldTaskConfig = {
    ...defaultNGramTinyWorldConfig,
    name: 'Generated Uni-Gram Tiny World',
    typeHierarchy: typeHierarchy,
    rules: rules,
  };

  return resultConfig;
}
