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



import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CornerActivationComponent } from './corner-activation.component';

import { signal, Component, Input, OnInit, ViewChild, OnDestroy, Signal, WritableSignal } from '@angular/core';

import { TwoVarGTensorDataset } from 'src/lib/gtensor/the_16_two_var_bool_fns';
import { ActivationManagerComponent } from '../activation-manager/activation-manager.component';
import { AxisWrapperComponent } from '../axis-wrapper/axis-wrapper.component';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CodemirrorConfigEditorModule } from 'src/app/codemirror-config-editor/codemirror-config-editor.module';
import { TensorImageModule } from 'src/app/tensor-image/tensor-image.module';
import { MatInputModule } from '@angular/material/input';

describe('CornerActivationComponent', () => {
  let component: CornerActivationComponent;
  let fixture: ComponentFixture<CornerActivationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        CodemirrorConfigEditorModule,
        TensorImageModule,
      ],
      declarations: [
        AxisWrapperComponent,
        ActivationManagerComponent,
        CornerActivationComponent
      ],
    });
    fixture = TestBed.createComponent(CornerActivationComponent);
    component = fixture.componentInstance;
    component.view = signal<'edit' | 'vis'>('vis');
    component.dataset = signal<TwoVarGTensorDataset | null>(null);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
