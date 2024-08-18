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
import { FreshNames } from '../names/simple_fresh_names';
import {
  Story,
  VarNames,
  applyRules,
  initStory,
  isUnboundVarName,
  nextRelDistrStats,
} from './stories';
import {
  parseRel,
  addToTypeMap,
  initTypeDef,
  parseTypeSet,
  parseTypeSetArgs,
  initRelationMap,
} from './relations';
import { parseRule } from './rules';

// const example_TinyWorldTaskConfig: TinyWorldTaskConfig<
//   ExampleObjects,
//   ExampleRelations
// > = {
//   name: 'example-tiny-world',
//   maxInputLen: 20,
//   maxOutputLen: 10,
//   seed: 0,
//   objectTokens: [...exampleObjects],
//   relationTokenArgs: relArgs,
// };

describe('stories', () => {
  const animalTypes = ['cat', 'monkey', 'elephant'] as const;
  const inanimateTypes = ['flower', 'rock', 'tree'] as const;
  const allTypes = [
    'animal',
    ...animalTypes,
    'inanimate',
    ...inanimateTypes,
    'squishable',
    '', // unspecified type
  ] as const;
  // "& {}" is a trick to get typescript errors to use the type name instead
  // of the full list of underlying union of string literals.
  type TypeName = (typeof allTypes)[number] & {};

  const types = new Map<TypeName, Set<TypeName>>();
  types.set('', new Set(allTypes));
  types.set('animal', new Set(animalTypes));
  types.set('inanimate', new Set(inanimateTypes));
  types.set('squishable', new Set([...animalTypes, 'flower', 'tree']));
  allTypes.forEach((t) => {
    if (!types.get(t)) {
      types.set(t, new Set());
    }
  });

  const allRelations = ['jumps-over', 'runs-away', 'squishes', 'is'] as const;
  // "& {}" is a trick to get typescript errors to use the type name instead
  // of the full list of underlying union of string literals.
  type RelName = (typeof allRelations)[number] & {};

  const relations = initRelationMap({
    'jumps-over': ['animal', ''],
    'runs-away': ['animal'],
    is: [''],
    squishes: ['animal', 'squishable'],
  });

  beforeEach(() => {});

  it('Story with relations', () => {
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    expect(s.names.config.usedNameSet).toContain('_m');
    expect(s.names.config.usedNameSet).toContain('_f');
    expect(s.varTypes.get('_m')).toEqual(new Set(['monkey']));
    expect(s.varTypes.get('_f')).toEqual(new Set(['flower']));
  });

  it('Story creation fails, story clash', () => {
    const rel2 = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:rock _f:flower'
    );
    expect(function () {
      const s = initStory(types, relations);
      s.extendScene([rel2]);
      // console.log(c);
    }).toThrowError(''); // Assert
  });

  it('Story.unify', () => {
    const s = initStory(types, relations);
    const unifyState = s.newUnifyState();
    const unifyFailed = s.unify(
      {
        relName: 'squishes',
        args: [
          { varName: '?x', varTypes: new Set(['']) },
          { varName: '?y', varTypes: new Set(['']) },
        ],
      },
      {
        relName: 'squishes',
        args: [
          { varName: '_a', varTypes: new Set(['cat']) },
          { varName: '_b', varTypes: new Set(['']) },
        ],
      },
      unifyState
    );

    expect(unifyFailed).toEqual(null);
    const varSubsts = unifyState.varSubsts;
    expect(varSubsts.get('?x')).toEqual('_a');
    expect(varSubsts.get('?y')).toEqual('_b');
    const varTypes = unifyState.varTypes;
    expect(varTypes.get('?x')).toEqual(new Set('cat'));
    expect(varTypes.get('?y')).toEqual(new Set(['squishable']));
    expect(varTypes.get('_a')).toEqual(new Set('cat'));
    expect(varTypes.get('_b')).toEqual(new Set('squishable'));
  });

  it('matchRule: simple match with a more general type in the rule', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?y | jumps-over ?x:animal ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    expect(ruleMatches.length).toEqual(1);
  });

  it('matchRule: simple match', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    expect(ruleMatches.length).toEqual(1);
  });

  it('matchRule: no match', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'squishes _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    expect(ruleMatches.length).toEqual(0);
  });

  it('matchRule: simple match', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    expect(ruleMatches.length).toEqual(1);
  });

  it('applyRuleMatch: simple match', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s: Story<TypeName, VarNames, RelName> = new Story(
      types,
      relations,
      new FreshNames(),
      new Map<VarNames, Set<TypeName>>(),
      isUnboundVarName
    );
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    const s2 = s.applyRuleMatch(ruleMatches[0]);
    expect(s2.scene.length).toEqual(2);
    expect(s2.scene[1].relName).toEqual('squishes');
    expect(s2.scene[1].args[0].varName).toEqual('_m');
    expect(s2.scene[1].args[0].varTypes).toEqual(new Set(['monkey']));
    expect(s2.scene[1].args[1].varName).toEqual('_f');
    expect(s2.scene[1].args[1].varTypes).toEqual(new Set(['flower']));
  });

  it('matchRule: bad new real: no such relation', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(foosquishes ?x ?y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    expect(() => {
      s.matchRule(rule);
    }).toThrowError('UnifyFailure:relNameMissingFromStory');
    // expect(ruleMatches.length).toEqual(1);
  });

  it('matchRule: bad new real: wrong arg count', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x v y | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);
    expect(() => {
      s.matchRule(rule);
    }).toThrowError('UnifyFailure:relNameStoryArityMismatch');
    // expect(ruleMatches.length).toEqual(1);
  });

  it('matchRule and applyRuleMatch: new var introduced, no conditions', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(is ?x) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>('is _a:monkey');
    const s = initStory(types, relations);
    s.extendScene([rel]);
    const ruleMatches = s.matchRule(rule);
    expect(ruleMatches.length).toEqual(1);
    console.log(ruleMatches);
    const s2 = s.applyRuleMatch(ruleMatches[0]);
    expect(s2.scene.length).toEqual(2);
    expect(s2.scene[1].relName).toEqual('is');
    expect(s2.scene[1].args[0].varName).toEqual('_b');
    expect(s2.scene[1].args[0].varTypes).toEqual(new Set(['']));
  });

  it('applyRuleMatch: new vars', () => {
    const rule = parseRule<TypeName, VarNames, RelName>(`
      S(squishes ?x ?z | jumps-over ?x ?y) *= 1
    `);
    const rel = parseRel<TypeName, VarNames, RelName>(
      'jumps-over _m:monkey _f:flower'
    );
    const s = initStory(types, relations);
    s.extendScene([rel]);

    const ruleMatches = s.matchRule(rule);
    const c2 = s.applyRuleMatch(ruleMatches[0]);
    expect(c2.scene.length).toEqual(2);
    expect(c2.scene[1].relName).toEqual('squishes');
    expect(c2.scene[1].args[0].varName).toEqual('_m');
    expect(c2.scene[1].args[0].varTypes).toEqual(new Set(['monkey']));
    expect(c2.scene[1].args[1].varName).toEqual('_a');
    expect(c2.scene[1].args[1].varTypes).toEqual(new Set(['squishable']));
  });

  it('Minimal rule distribution calculation: additive only', () => {
    const rule1 = 'S(squishes ?x ?y | jumps-over ?x:animal ?y:flower) += 1';
    const rule2 = 'S(squishes ?x ?y | jumps-over ?x:monkey ?y:flower) += 5';
    const rules = [rule1, rule2].map((r) =>
      parseRule<TypeName, VarNames, RelName>(r)
    );

    const scene = [
      'jumps-over _m:monkey _f:flower',
      'jumps-over _c:cat _f:flower',
    ].map((s) => parseRel<TypeName, VarNames, RelName>(s));

    const s = initStory(types, relations);
    s.extendScene(scene);

    const nextRelPossibilities = nextRelDistrStats(applyRules(rules, s));
    expect([...nextRelPossibilities.keys()].length).toEqual(2);

    expect(
      nextRelPossibilities.get('squishes _m:monkey _f:flower')?.totalScore
    ).toEqual(6);
    expect(
      nextRelPossibilities.get('squishes _m:monkey _f:flower')?.prob
    ).toEqual(6 / 7);
    expect(
      nextRelPossibilities.get('squishes _c:cat _f:flower')?.totalScore
    ).toEqual(1);
    expect(nextRelPossibilities.get('squishes _c:cat _f:flower')?.prob).toEqual(
      1 / 7
    );
  });

  // it('Rule distribution calculation: additive and multiplicative', () => {
  //   const rule1 = 'S(runs-away ?x | jumps-over ?x ?y) += 1';
  //   const rule2 = 'S(runs-away ?x | jumps-over ?y ?x) *= 0';
  //   const rule3 = 'S(runs-away ?x | runs-away ?x) *= 0';
  //   const rules = [rule1, rule2, rule3].map((r) =>
  //     parseRule<TypeNames, VarNames, RelNames>(r)
  //   );

  //   const scene = [
  //     'jumps-over _m:monkey _f:flower',
  //     'jumps-over _c:cat _f:flower',
  //   ].map((s) => parseRel<TypeNames, VarNames, RelNames>(s));

  //   const s: Story<TypeNames, VarNames, RelNames> = new Story(
  //     types,
  //     relations,
  //     new FreshNames(),
  //     new Map<VarNames, TypeNames>(),
  //     isUnboundVarName
  //   );
  //   s.extendScene(scene);

  //   const nextRelPossibilities = nextRelDistrStats(applyRules(rules, s));

  //   expect([...nextRelPossibilities.keys()].length).toEqual(2);
  //   expect(
  //     nextRelPossibilities.get('squishes _m:monkey _f:flower')?.totalScore
  //   ).toEqual(1);
  //   expect(
  //     nextRelPossibilities.get('squishes _m:monkey _f:flower')?.prob
  //   ).toEqual(1);
  //   expect(
  //     nextRelPossibilities.get('squishes _c:cat _f:flower')?.totalScore
  //   ).toEqual(0);
  //   expect(nextRelPossibilities.get('squishes _c:cat _f:flower')?.prob).toEqual(
  //     0
  //   );
  // });

  it('Minimal rule distribution calculation: additive and multiplicative', () => {
    const rule1 = 'S(squishes ?x ?y | jumps-over ?x ?y) += 1';
    const rule2 = 'S(squishes ?x ?y | jumps-over ?x:cat ?y:flower) *= 0';
    const rules = [rule1, rule2].map((r) =>
      parseRule<TypeName, VarNames, RelName>(r)
    );

    const scene = [
      'jumps-over _m:monkey _f:flower',
      'jumps-over _c:cat _f:flower',
    ].map((s) => parseRel<TypeName, VarNames, RelName>(s));

    const s = initStory(types, relations);
    s.extendScene(scene);

    const nextRelPossibilities = nextRelDistrStats(applyRules(rules, s));
    // console.log(
    //   'nextRelEval',
    //   JSON.stringify([...nextRelPossibilities], null, 2)
    // );

    expect([...nextRelPossibilities.keys()].length).toEqual(2);
    expect(
      nextRelPossibilities.get('squishes _m:monkey _f:flower')?.totalScore
    ).toEqual(1);
    expect(
      nextRelPossibilities.get('squishes _m:monkey _f:flower')?.prob
    ).toEqual(1);
    expect(
      nextRelPossibilities.get('squishes _c:cat _f:flower')?.totalScore
    ).toEqual(0);
    expect(nextRelPossibilities.get('squishes _c:cat _f:flower')?.prob).toEqual(
      0
    );
  });

  it('Negative rules & nothing else to be said', () => {
    const rule1 = 'S(is ?x:cat | runs-away ?x, -is ?x:cat) += 1';
    const rules = [rule1].map((r) => parseRule<TypeName, VarNames, RelName>(r));

    const scene = ['runs-away _c:cat'].map((s) =>
      parseRel<TypeName, VarNames, RelName>(s)
    );

    const s = initStory(types, relations);
    s.extendScene(scene);

    const ruleApps = applyRules(rules, s);
    expect([...ruleApps.keys()]).toEqual(['is _c:cat']);
    const nextStory = [...ruleApps.values()][0][0].story;
    const newRel = nextStory.scene[1];
    expect(newRel.relName).toEqual('is');
    expect(newRel.args[0].varName).toEqual('_c');
    expect(newRel.args[0].varTypes).toEqual(new Set(['cat']));

    const ruleApps2 = applyRules(rules, nextStory);
    expect([...ruleApps2.keys()]).toEqual([]);
  });

  it('addToTypeMap', () => {
    const typeMap = initTypeDef({
      animal: ['cat', 'monkey', 'elephant'],
      inanimate: ['rock', 'tree', 'flower'],
      squishable: ['cat', 'monkey', 'flower'],
    });
    expect(typeMap.get('')!.size).toBe(9);
    expect(typeMap.get('animal')).toContain('cat');
    expect(typeMap.get('animal')).toContain('monkey');
    expect(typeMap.get('animal')).toContain('elephant');
    expect(typeMap.get('animal')?.size).toBe(3);
  });

  it('Making a new example domain using helpers', () => {
    const typeMap = initTypeDef({
      animal: ['cat', 'monkey', 'elephant'],
      inanimate: ['rock', 'tree', 'flower'],
      squishable: ['cat', 'monkey', 'flower'],
    });

    const allRelations2 = ['jumps', 'runsAway', 'squishes', 'is'] as const;
    // "& {}" is a trick to get typescript errors to use the type name instead
    // of the full list of underlying union of string literals.
    type RelName2 = (typeof allRelations2)[number] & {};

    const relationMap = initRelationMap<RelName2, TypeName>({
      is: [''],
      runsAway: ['animal'],
      squishes: ['animal', 'squishable'],
      jumps: ['animal'],
    });
    const baseStoryStrs: string[] = ['is _a:cat'];
    const ruleStrs: string[] = [
      'S(is ?x:cat) += 1',
      'S(is ?x | is ?y) *= 0.5',
      'S(jumps ?x | is ?x:animal) += 5',
      'S(squishes ?x ?y | jumps ?x:cat, is ?y) += 1',
    ];

    const story = initStory(typeMap, relationMap);
    const scene = baseStoryStrs.map((rStr) =>
      parseRel<TypeName, VarNames, RelName2>(rStr)
    );
    story.extendScene(scene);

    const rules = ruleStrs.map((rStr) =>
      parseRule<TypeName, VarNames, RelName2>(rStr)
    );

    console.log(...story.types);
    const matches = story.matchRule(rules[2]);
    console.log(matches);
    expect(matches.length).toBe(1);
  });
});
