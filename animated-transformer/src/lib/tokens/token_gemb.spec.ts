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

// token_gemb.spec.ts

import { GVariable, GTensor, makeTruncNormal } from '../gtensor/gtensor';
import * as tf from '@tensorflow/tfjs';
import {
  strSeqPrepFn,
  embed,
  prepareBasicTaskTokenRep,
  embedBatch,
} from '../tokens/token_gemb';
import { GVariableTree, GTensorTree } from '../gtensor/gtensor_tree';

describe('token_gemb', () => {
  it('embed', () => {
    const [aEmb, bEmb, padEmb] = [
      [1, 1],
      [2, 2],
      [0, 0],
    ];
    const tokens = ['a', 'b', '[pad]'];
    const tokenRep = prepareBasicTaskTokenRep(tokens);
    const embeddings = new GTensor(tf.tensor([aEmb, bEmb, padEmb]), [
      'tokenId',
      'inputRep',
    ]);
    const seqToEmbed = ['a', 'b', '[PAD]', 'a'];
    const embeddedSeq = embed(tokenRep.tokenToIdx, embeddings, seqToEmbed);
    const positionEmb = embeddedSeq.unstack('pos');
    expect(positionEmb.length).toEqual(4);
    expect(positionEmb[0].tensor.arraySync()).toEqual(aEmb);
    expect(positionEmb[1].tensor.arraySync()).toEqual(bEmb);
    expect(positionEmb[2].tensor.arraySync()).toEqual(padEmb);
    expect(positionEmb[3].tensor.arraySync()).toEqual(aEmb);
  });

  it('batchEmbed, pad start', () => {
    const [aEmb, bEmb, padEmb] = [
      [1, 1],
      [2, 2],
      [0, 0],
    ];
    const tokens = ['a', 'b', '[pad]'];
    const tokenRep = prepareBasicTaskTokenRep(tokens);
    const tokenEmbedding = new GTensor(tf.tensor([aEmb, bEmb, padEmb]), [
      'tokenId',
      'inputRep',
    ]);

    const seqsToEmbed = [
      ['a', 'b', '[pad]', 'a'],
      ['a', 'b'],
      [],
      ['b'],
      ['a'],
    ];

    const seqEmb = embedBatch(
      tokenRep.tokenToIdx,
      tokenEmbedding,
      seqsToEmbed,
      {
        paddingId: 2,
        padAt: 'start',
        dtype: 'int32',
      }
    );
    const batchesEmb = seqEmb.unstack('batch');
    expect(batchesEmb.length).toEqual(5);
    expect(batchesEmb[0].tensor.arraySync()).toEqual([
      aEmb,
      bEmb,
      padEmb,
      aEmb,
    ]);
    expect(batchesEmb[1].tensor.arraySync()).toEqual([
      padEmb,
      padEmb,
      aEmb,
      bEmb,
    ]);
    expect(batchesEmb[2].tensor.arraySync()).toEqual([
      padEmb,
      padEmb,
      padEmb,
      padEmb,
    ]);
    expect(batchesEmb[3].tensor.arraySync()).toEqual([
      padEmb,
      padEmb,
      padEmb,
      bEmb,
    ]);
    expect(batchesEmb[4].tensor.arraySync()).toEqual([
      padEmb,
      padEmb,
      padEmb,
      aEmb,
    ]);
  });

  it('batchEmbed, pad end', () => {
    const [aEmb, bEmb, padEmb] = [
      [1, 1],
      [2, 2],
      [0, 0],
    ];
    const tokens = ['a', 'b', '[pad]'];
    const tokenRep = prepareBasicTaskTokenRep(tokens);
    const embeddings = new GTensor(tf.tensor([aEmb, bEmb, padEmb]), [
      'tokenId',
      'inputRep',
    ]);

    const seqsToEmbed = [
      ['a', 'b', '[pad]', 'a'],
      ['a', 'b'],
      [],
      ['b'],
      ['a'],
    ];

    const seqEmb = embedBatch(tokenRep.tokenToIdx, embeddings, seqsToEmbed, {
      paddingId: 2,
      padAt: 'end',
      dtype: 'int32',
    });
    const batchesEmb = seqEmb.unstack('batch');
    expect(batchesEmb.length).toEqual(5);
    expect(batchesEmb[0].tensor.arraySync()).toEqual([
      aEmb,
      bEmb,
      padEmb,
      aEmb,
    ]);
    expect(batchesEmb[1].tensor.arraySync()).toEqual([
      aEmb,
      bEmb,
      padEmb,
      padEmb,
    ]);
    expect(batchesEmb[2].tensor.arraySync()).toEqual([
      padEmb,
      padEmb,
      padEmb,
      padEmb,
    ]);
    expect(batchesEmb[3].tensor.arraySync()).toEqual([
      bEmb,
      padEmb,
      padEmb,
      padEmb,
    ]);
    expect(batchesEmb[4].tensor.arraySync()).toEqual([
      aEmb,
      padEmb,
      padEmb,
      padEmb,
    ]);
  });

  it('strSeqPrepFn', () => {
    const tokens = ['a', 'b'];
    const tokenRep = prepareBasicTaskTokenRep(tokens);
    const tokenEmbParams = new GVariableTree({
      tokenEmbedding: new GVariable(
        makeTruncNormal({
          tokenId: tokenRep.tokens.length,
          inputRep: 2,
        })
      ),
    });

    const seqToEmbed = ['a', 'b', '[PAD]', 'a'];

    const embeddedSeq = strSeqPrepFn(tokenRep, tokenEmbParams, 6, [seqToEmbed]);

    const tokenEmbUnstacked =
      tokenEmbParams.obj.tokenEmbedding.unstack('tokenId');
    const aRep = tokenEmbUnstacked[tokenRep.tokenToIdx['a']].tensor.arraySync();
    const bRep = tokenEmbUnstacked[tokenRep.tokenToIdx['b']].tensor.arraySync();
    const padRep =
      tokenEmbUnstacked[tokenRep.tokenToIdx['[PAD]']].tensor.arraySync();

    const positionEmb = embeddedSeq.unstack('batch')[0].unstack('pos');
    expect(positionEmb.length).toEqual(6);
    // Observe that padding is added at the start of the seq
    // (so that final token prediction acts as expected)
    expect(positionEmb[0].tensor.arraySync()).toEqual(padRep);
    expect(positionEmb[1].tensor.arraySync()).toEqual(padRep);
    expect(positionEmb[2].tensor.arraySync()).toEqual(aRep);
    expect(positionEmb[3].tensor.arraySync()).toEqual(bRep);
    expect(positionEmb[4].tensor.arraySync()).toEqual(padRep);
    expect(positionEmb[5].tensor.arraySync()).toEqual(aRep);
  });
});
