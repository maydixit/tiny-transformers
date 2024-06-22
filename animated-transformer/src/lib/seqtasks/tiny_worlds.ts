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

/* Tiny Worlds */

import * as tf from '@tensorflow/tfjs';
import {
  BasicLmTask,
  BasicRandSeededTaskConfig,
  Example,
  randOfList,
  RandomStream,
} from './util';
import { FreshNames } from '../names/simple_fresh_names';
import {
  Context,
  parseRel,
  Rule,
  stringifyRelation,
} from '../logic/generative_logic';
import { SimpleJsTreesLib } from '../js_tree/js_tree';

// Ideas for fancier rules/variants
//
// If a monkey just jumped over something, they are not so likely to jump again right away.
// '[... jumps-over _x _y ...:3] ==> jumps-over _x _y *= 0.1',
//
// Let actions/observations have names too.
// '_e: (tries_to_jumps_over _x:monkey _y) ==> succeeds(_e) += 1',
//
// Should types be observations?, e.g. could we write:
// '_x:cat ==> runs-away _x += 1'
// i.e. that would be the same as: 'is _x cat ==> runs-away _x += 1'
//
// Should we allow an unbound syntax?
// 'jumps-over monkey _y += 5' === 'jumps-over _x:monkey _y += 5' ?
// Maybe this is just syntax, so we skip it? Or maybe this somehow says that one
// *cannot* bind to the monkey, i.e. is says there was an unknown monkey who jumped over _y?

// ============================================================================== //
//  Tiny World Task Configs
// ============================================================================== //

// ============================================================================== //
//
// ============================================================================== //

type TypeHierarchy = string[] | { [name: string]: TypeHierarchy };

export interface TinyWorldTaskConfig extends BasicRandSeededTaskConfig {
  typeHierarchy: TypeHierarchy;
  relationKinds: { [relName: string]: string[] };
  baseContext: string[];
  rules: string[];
  maxEntityLimit: number;
}

const defaultTinyWorldTaskConfig: TinyWorldTaskConfig = {
  name: 'tiny synthetic world',
  seed: 0,
  maxInputLen: 10,
  maxOutputLen: 10,
  typeHierarchy: {
    animal: ['cat', 'monkey', 'elephant'],
    inanimate: ['rock', 'tree', 'flower'],
    squishable: ['cat', 'monkey', 'flower'],
  },
  relationKinds: {
    is: [''],
    'runs-away': ['animal'],
    squishes: ['animal', 'squishable'],
    jumps: ['animal'],
  },
  baseContext: [],
  rules: [
    // TODO: We might want type-variables, save us from enumerating rules
    // for all of these...
    //
    // We might mention any new kind kind of thing (at any level of abstraction!)
    'S(is ?x:cat) += 1',
    'S(is ?x:monkey) += 2', // But stories of monkeys are the best and most common
    'S(is ?x:elephant) += 1',
    'S(is ?x:rock) += 1',
    'S(is ?x:tree) += 1',
    'S(is ?x:flower) += 1',
    'S(is ?x:animal) += 1',
    'S(is ?x:inanimate) += 1',
    'S(is ?x:squishable) += 1',

    // A mentioned animal might jump
    'S(jumps ?x | is ?x:animal) += 2',

    // When they jump, monkeys and cats sometimes squish things, but monkeys more often
    //
    // TODO: we've like to express that you can squish one thing per jump.
    'S(squishes ?x ?y | jumps ?x:monkey, is ?y) += 2',
    'S(squishes ?x ?y | jumps ?x:cat, is ?y) += 1',

    // Cats sometimes run away away when elephants jump
    'S(runs-away ?c | jumps ?e:elephant, is ?c:cat) += 2',
    // Any existing animal might run away at any time
    'S(runs-away ?x | is ?c) += 1',
    // A new never mentioned animal might run away
    'S(runs-away ?x) += 1',

    // We might note that an animal that ran away is a cat (if we didn't say it before)
    //
    // TODO: I'd like to be able to quantify over the type... e.g. but that means
    // implicitly defining a distinution over types, which I guess would be some kind of equal split?
    // And also, how do you manage many level of specificity? t?<..<animal and t?<=..<=animal
    //   'S(is ?x:?t<animal | runs-away ?x, -is ?x:?t) += 1',
    'S(is ?x:cat | runs-away ?x, -is ?x:cat) += 1',

    // When an animal runs away, it can't squish anything, jump or run-away again.
    // NOTE: We could also use negative conditions on the positive action...
    //
    // TODO: below is a nice example of why we should use linear
    // types for conditions, not depend on past statements
    // (like we do below)... linear types could saves us from the frame problem!
    'S(jumps ?a | runs-away ?a:animal) *= 0',
    'S(squishes ?x ?a | runs-away ?a:animal) *= 0',
    'S(runs-away ?x ?a | runs-away ?a:animal) *= 0',
    // Squished animals can't run away or jump anymore
    'S(runs-away ?y | squishes ?x ?y:animal) *= 0',
    'S(jumps ?y | squishes ?x ?y:animal) *= 0',
  ],
  maxEntityLimit: 6,
};

// function makeTypeHierarchyeVocab(h: TypeHierarchy): string[] {
//   if (Array.isArray(h)) {
//     return h;
//   } else {
//     const subTaxonomy = Object.keys(h);
//     const subtypes = Object.values(h).flatMap(makeTypeHierarchyeVocab);
//     return [...subTaxonomy, ...subtypes];
//   }
// }

function addToTypeMap(
  h: TypeHierarchy,
  m: Map<string, Set<string>>
): Set<string> {
  if (Array.isArray(h)) {
    h.forEach((t) => m.set(t, new Set()));
    return new Set(h);
  } else {
    const subTaxonomy = Object.keys(h);
    // let allSubTypes: string[] = [];
    const allSubTypes = new Set<string>();
    subTaxonomy.forEach((t) => {
      const subTypes = addToTypeMap(h[t], m);
      m.set(t, new Set(subTypes));
      subTypes.forEach((t) => allSubTypes.add(t));
    });
    return allSubTypes;
  }
}

// function makeConfigVocab(c: TinyWorldTaskConfig): string[] {
//   const freshNames = new FreshNames();
//   const varNames: string[] = [];
//   for (let i = 0; i < c.maxEntityLimit; i++) {
//     const n = freshNames.makeAndAddNextName();
//     varNames.push(n);
//   }

//   return [
//     ...Object.keys(c.relationKinds),
//     ...makeTypeHierarchyeVocab(c.typeHierarchy),
//     ...varNames,
//   ];
// }

export const sepToken = ', ';
export type SepToken = typeof sepToken;
type VarNames = `_${string}` | `?${string}`;
function isUnboundVarName(v: string): boolean {
  // console.log(v, v[0] === '?');
  return v[0] === '?';
}

// ============================================================================== //
//  Tiny World Task Configs
// ============================================================================== //

export class TinyWorldTask implements BasicLmTask {
  // TODO: consider doing programatically in the constructor?
  public name: string;
  public baseVocab: string[];
  public random: RandomStream;
  private exampleId = 0;
  public initContext: Context<string, string, string>;

  constructor(public config: TinyWorldTaskConfig) {
    this.name = config.name;
    this.random = new RandomStream(config.seed);

    const typeMap = new Map<string, Set<string>>();
    const allTypes = addToTypeMap(this.config.typeHierarchy, typeMap);
    typeMap.set('', allTypes);

    const relationMap = new Map<string, string[]>();
    Object.keys(this.config.relationKinds).forEach((r) => {
      relationMap.set(r, this.config.relationKinds[r]);
    });

    const freshNames = new FreshNames();
    const varNames: string[] = [];
    for (let i = 0; i < this.config.maxEntityLimit; i++) {
      const n = freshNames.makeAndAddNextName();
      varNames.push(n);
    }

    this.baseVocab = [
      sepToken,
      ...Object.keys(relationMap),
      ...allTypes,
      ...varNames,
    ];

    this.initContext = new Context(
      typeMap,
      relationMap,
      new FreshNames(),
      new Map<string, string>(),
      this.config.baseContext.map((r) => parseRel(r)),
      isUnboundVarName
    );
  }

  genRandExample(): Example {
    // this.config.

    // const context = [...this.config.baseContext];
    // const bindings = {};

    // // The secret token
    // const secretToken = randOfList(this.random, this.config.objectTokens);
    // // console.log('secretToken:', secretToken);

    // // Create random tokens such that we don't go over the max length:
    // // Each random token, t, will be followed by tokenToBoolFn(secretToken, t)
    // const numberOfRandomTokens = Math.floor((this.config.maxInputLen + 1) / 2);
    // const randomTokenIds = tf
    //   .randomUniform(
    //     [numberOfRandomTokens],
    //     0,
    //     this.config.objectTokens.length,
    //     'int32',
    //     this.random.random()
    //   )
    //   .arraySync() as number[];

    // const finalId = randomTokenIds.pop();
    // if (finalId === undefined) {
    //   throw new Error(`no input Id. maxInputLen: ${this.config.maxInputLen}`);
    // }

    // const input = randomTokenIds
    //   .map((i) => {
    //     const thisToken = this.config.objectTokens[i];
    //     return [
    //       thisToken,
    //       this.tokenToBoolFn(secretToken, thisToken) ? 'T' : 'F',
    //     ];
    //   })
    //   .flat();
    // const finalToken = this.config.objectTokens[finalId];
    // input.push(finalToken);

    // const target = [this.tokenToBoolFn(secretToken, finalToken) ? 'T' : 'F'];

    return {
      id: this.exampleId++,
      input: ['a', 'b'],
      output: ['a', 'b'],
      secret: ['secretToken'],
    };
  }

  *makeExamplesGenerator(): Generator<Example, undefined, undefined> {
    while (true) {
      yield this.genRandExample();
    }
  }
}
