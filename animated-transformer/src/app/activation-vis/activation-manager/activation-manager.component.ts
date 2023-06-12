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


import { signal, Component, Input, OnInit, ViewChild, OnDestroy, Signal, WritableSignal } from '@angular/core';
import { basicGatesAsGTensor, TwoVarGTensorDataset } from '../../../lib/gtensor/the_16_two_var_bool_fns';
import { Observable } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-activation-manager',
  templateUrl: './activation-manager.component.html',
  styleUrls: ['./activation-manager.component.scss']
})
export class ActivationManagerComponent {

  @Input()
  view!: WritableSignal<'edit' | 'vis'>;

  @Input()
  dataset!: Signal<TwoVarGTensorDataset | null>;

  // // view = signal('vis' as 'edit' | 'vis');
  // currentDataset = signal(null as TwoVarGTensorDataset | null);
}
