{ SPDX-License-Identifier: Apache-2.0                                   }
{ Copyright (c) 2026 George Saliba <george.saliba@salitronic.com>                                      }
{..............................................................................}
{ Library.pas - Library management functions for the Altium integration bridge                }
{..............................................................................}

{ Return a component's first linked implementation (the footprint model in   }
{ the common case). Altium does not expose a "current implementation"         }
{ getter, GetState_CurrentImplementation is not a real method, implementations}
{ are reached only through the component's child-object iterator. Nil when    }
{ the component has no implementations.                                        }
Function GetFirstSchImplementation(Comp : ISch_Component) : ISch_Implementation;
Var
    ImplIter : ISch_Iterator;
Begin
    Result := Nil;
    If Comp = Nil Then Exit;
    Try
        ImplIter := Comp.SchIterator_Create;
        If ImplIter <> Nil Then
        Begin
            ImplIter.AddFilter_ObjectSet(MkSet(eImplementation));
            Result := ImplIter.FirstSchObject;
            Comp.SchIterator_Destroy(ImplIter);
        End;
    Except
    End;
End;

{ Set the part ownership fields on a primitive so the lib editor knows     }
{ which part of the component it belongs to. Per Altium's official         }
{ createcomp_in_lib.pas reference, primitives without OwnerPartId /        }
{ OwnerPartDisplayMode are added to the component's collection but the    }
{ editor can't display them, symbols appear empty.                        }
Procedure SetOwnerPart(Obj : ISch_GraphicalObject; Component : ISch_Component);
Begin
    If Obj = Nil Then Exit;
    If Component <> Nil Then
    Begin
        Try Obj.OwnerPartId := Component.CurrentPartID; Except End;
        Try Obj.OwnerPartDisplayMode := Component.DisplayMode; Except End;
    End
    Else
    Begin
        Try Obj.OwnerPartId := 1; Except End;
        Try Obj.OwnerPartDisplayMode := 0; Except End;
    End;
End;

{ Resolve the target component for a Lib_Add* primitive helper.             }
{                                                                              }
{ SchLib.CurrentSchComponent in DelphiScript reflects the editor's selected }
{ component, which doesn't update when we add a new component via           }
{ AddSchComponent (the setter is a no-op). Trusting it would attach        }
{ primitives to whatever the editor was showing first (usually the default  }
{ Component_1 placeholder), leaving every newly-created symbol empty.       }
{                                                                              }
{ Use the global LastCreatedLibComponent we set in Lib_CreateSymbol         }
{ instead, falling back to CurrentSchComponent only if nothing has been     }
{ created in this session.                                                  }
Function GetTargetLibComponent(SchLib : ISch_Lib) : ISch_Component;
Begin
    Result := LastCreatedLibComponent;
    If Result = Nil Then
    Begin
        If SchLib <> Nil Then
            Result := SchLib.CurrentSchComponent;
    End;
End;

{ Mark the focused SchLib doc dirty without an immediate full-file save.    }
{ DoFileSave on a multi-MB SchLib costs hundreds of milliseconds to seconds }
{ per call, so doing it from every singular mutation (lib_add_pin,          }
{ lib_set_component_description, lib_link_footprint, ...) made one-symbol-  }
{ at-a-time editing unusable. Mirror the project-side deferred-save pattern }
{ (perf_deferred_save): mutations only flag dirty, and `save_all` /         }
{ SaveAllDirty flushes the .SchLib to disk at a logical checkpoint. The     }
{ workspace's free-document save sweep already covers standalone libs, so   }
{ no save_all changes are needed.                                            }
Procedure MarkLibDirty(SchLib : ISch_Lib);
Var
    Workspace : IWorkspace;
    Doc : IDocument;
    FullPath : String;
    ServerDoc : IServerDocument;
Begin
    If SchLib = Nil Then Exit;
    Workspace := GetWorkspace;
    If Workspace <> Nil Then
    Begin
        Doc := Workspace.DM_FocusedDocument;
        If Doc <> Nil Then
        Begin
            FullPath := '';
            Try FullPath := Doc.DM_FullPath; Except End;
            If FullPath <> '' Then
            Begin
                ServerDoc := Client.GetDocumentByPath(FullPath);
                If ServerDoc <> Nil Then
                    Try ServerDoc.SetModified(True); Except End;
            End;
        End;
    End;
    { Force a SchLib editor redraw -- without this, primitives that were just }
    { committed (lines, rectangles, pins, polygons, arcs added by Lib_Add*)   }
    { are saved to memory + disk but the open lib editor window doesn't show  }
    { them until the user manually closes and reopens the symbol. The         }
    { SchLib editor renders the CURRENT COMPONENT, not the lib document, so   }
    { SchLib.GraphicallyInvalidate alone is insufficient. Invalidate the      }
    { component too, and process pending paint messages so the new state     }
    { surfaces immediately.                                                  }
    Try SchLib.GraphicallyInvalidate; Except End;
    Try
        If SchLib.CurrentSchComponent <> Nil Then
            SchLib.CurrentSchComponent.GraphicallyInvalidate;
    Except End;
    Try Application.ProcessMessages; Except End;
End;

Function Lib_CreateSymbol(Params : String; RequestId : String) : String;
Var
    Name, DesignatorPrefix, Description : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    PartCount : Integer;
Begin
    Name := ExtractJsonValue(Params, 'name');
    DesignatorPrefix := ExtractJsonValue(Params, 'designator_prefix');
    Description := ExtractJsonValue(Params, 'description');
    PartCount := StrToIntDef(ExtractJsonValue(Params, 'part_count'), 1);
    If PartCount < 1 Then PartCount := 1;

    If DesignatorPrefix = '' Then DesignatorPrefix := 'U';

    // Get the current schematic library
    If SchServer = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    // Create new component. Per Altium's createcomp_in_lib.pas reference,
    // CurrentPartID and DisplayMode must be set BEFORE adding primitives;
    // primitives carry OwnerPartId/OwnerPartDisplayMode that link them to
    // a specific part of the component. Without this scaffold, primitives
    // are added but the lib editor can't display them (symbol shows empty).
    Component := SchServer.SchObjectFactory(eSchComponent, eCreate_Default);
    If Component <> Nil Then
    Begin
        Component.CurrentPartID := 1;
        Component.DisplayMode := 0;
        { Multi-part symbols (quad op-amp, dual gate, etc) need PartCount  }
        { set BEFORE pin / primitive add so each primitive's OwnerPartId    }
        { can address a real sub-part.                                      }
        Try Component.PartCount := PartCount; Except End;
        Component.LibReference := Name;
        Component.Designator.Text := DesignatorPrefix + '?';
        Component.ComponentDescription := Description;

        SchServer.ProcessControl.PreProcess(SchLib, '');
        SchLib.AddSchComponent(Component);
        { AddSchComponent overrides LibReference with an auto-generated      }
        { 'Component_<N>' on the second and later additions to the same     }
        { SchLib in one session. The pre-add assignment on line 119 sticks  }
        { only for the first symbol. Re-assign here so the caller's chosen  }
        { name is what survives to disk (and what ResolveLibRef will see).  }
        Component.LibReference := Name;
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

        // Broadcast as a new component (source=nil, dest=c_BroadCast). This
        // is the pattern in Altium's createcomp_in_lib.pas, different from
        // the per-primitive SchRegisterObject(Container, Obj) which sends
        // from the container.
        Try
            SchServer.RobotManager.SendMessage(
                Nil, Nil, SCHM_PrimitiveRegistration,
                Component.I_ObjectAddress);
        Except End;

        SchLib.CurrentSchComponent := Component;
        LastCreatedLibComponent := Component;

        // Refresh the library editor view so the new component is visible.
        Try SchLib.GraphicallyInvalidate; Except End;

        MarkLibDirty(SchLib);
        Result := BuildSuccessResponse(RequestId,
            JsonObj(
                JsonBool('success', True) + ',' +
                JsonStr('name', Name) + ',' +
                JsonInt('part_count', PartCount)
            ));
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create symbol');
End;

{ Lib_SetCurrentComponent — make a named component the "current" one in    }
{ the SchLib editor so subsequent SchIterator-based commands (modify_objects }
{ on ePin / eRectangle / eParameter via active_doc scope) target it. The    }
{ asymmetry this fixes: GetState_SchComponentByLibRef is a read-only fetch  }
{ that does NOT update the editor's selection -- without this command, the  }
{ SchLib editor stays pointed at whatever was last manually clicked (or     }
{ the first component on load), so modify_objects silently hits the wrong  }
{ component when the caller thinks they switched.                          }
{ Switch the active SchLib's current component to the named symbol and      }
{ return it (Nil on any failure: no SchServer, no active SchLib, or no      }
{ component with that lib-ref). Shared by Lib_SetCurrentComponent and the   }
{ lib_component scope handling in the generic primitives, so a caller can   }
{ target a library symbol without a separate set_current_component round-   }
{ trip.                                                                      }
Function SelectLibComponent(Name : String) : ISch_Component;
Var
    SchLib : ISch_Lib;
    Component : ISch_Component;
Begin
    Result := Nil;
    If (Name = '') Or (SchServer = Nil) Then Exit;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then Exit;

    Component := SchLib.GetState_SchComponentByLibRef(Name);
    If Component = Nil Then Exit;

    SchLib.CurrentSchComponent := Component;
    LastCreatedLibComponent := Component;
    { Reset PartID + DisplayMode so subsequent Lib_AddSymbol* calls write     }
    { their primitives onto the visible normal-mode part (Part 1, DisplayMode }
    { 0). Without this, after a fresh SchLib reopen Component.CurrentPartID   }
    { can be 0 (no part) and AddSchObject silently succeeds but the primitive }
    { lands on an invisible bucket -- explains the "line added with success   }
    { but no eLine in query_objects" behaviour observed 2026-05-16.           }
    Try Component.CurrentPartID := 1; Except End;
    Try Component.DisplayMode := 0; Except End;
    Try SchLib.GraphicallyInvalidate; Except End;
    Result := Component;
End;

Function Lib_SetCurrentComponent(Params : String; RequestId : String) : String;
Var
    Name : String;
    Component : ISch_Component;
Begin
    Name := ExtractJsonValue(Params, 'name');
    If Name = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_NAME', 'name is required');
        Exit;
    End;

    Component := SelectLibComponent(Name);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NOT_FOUND',
            'Component not found in active library: ' + Name);
        Exit;
    End;

    Result := BuildSuccessResponse(RequestId,
        '{"success":true,"name":"' + EscapeJsonString(Name) + '"}');
End;

Function Lib_AddPin(Params : String; RequestId : String) : String;
Var
    Designator, Name, ElecType : String;
    X, Y, Length, Rotation : Integer;
    Hidden : Boolean;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Pin : ISch_Pin;
Begin
    Designator := ExtractJsonValue(Params, 'designator');
    Name := ExtractJsonValue(Params, 'name');
    X := StrToIntDef(ExtractJsonValue(Params, 'x'), 0);
    Y := StrToIntDef(ExtractJsonValue(Params, 'y'), 0);
    Length := StrToIntDef(ExtractJsonValue(Params, 'length'), 200);
    Rotation := StrToIntDef(ExtractJsonValue(Params, 'rotation'), 0);
    ElecType := ExtractJsonValue(Params, 'electrical_type');
    Hidden := ExtractJsonValue(Params, 'hidden') = 'true';

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Pin := SchServer.SchObjectFactory(ePin, eCreate_Default);
    If Pin <> Nil Then
    Begin
        Pin.Designator := Designator;
        Pin.Name := Name;
        Pin.Location.X := MilsToCoord(X);
        Pin.Location.Y := MilsToCoord(Y);
        Pin.PinLength := MilsToCoord(Length);
        Pin.Orientation := Rotation Div 90;
        Pin.IsHidden := Hidden;

        // Set electrical type. The bidirectional constant is spelled
        // eElectricIO in Altium's DelphiScript (eElectricBiDir is undeclared).
        If ElecType = 'input' Then Pin.Electrical := eElectricInput
        Else If ElecType = 'output' Then Pin.Electrical := eElectricOutput
        Else If ElecType = 'bidirectional' Then Pin.Electrical := eElectricIO
        Else If ElecType = 'io' Then Pin.Electrical := eElectricIO
        Else If ElecType = 'power' Then Pin.Electrical := eElectricPower
        Else If ElecType = 'open_collector' Then Pin.Electrical := eElectricOpenCollector
        Else If ElecType = 'open_emitter' Then Pin.Electrical := eElectricOpenEmitter
        Else If ElecType = 'hiz' Then Pin.Electrical := eElectricHiZ
        Else Pin.Electrical := eElectricPassive;

        SchServer.ProcessControl.PreProcess(SchLib, '');
        SetOwnerPart(Pin, Component);
        Component.AddSchObject(Pin);
        SchRegisterObject(Component, Pin);
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

        MarkLibDirty(SchLib);
        Result := BuildSuccessResponse(RequestId, '{"success":true,"designator":"' + EscapeJsonString(Designator) + '"}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create pin');
End;

Function Lib_AddSymbolRectangle(Params : String; RequestId : String) : String;
Var
    X1, Y1, X2, Y2 : Integer;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Rect : ISch_Rectangle;
    Loc : TLocation;
Begin
    X1 := StrToIntDef(ExtractJsonValue(Params, 'x1'), 0);
    Y1 := StrToIntDef(ExtractJsonValue(Params, 'y1'), 0);
    X2 := StrToIntDef(ExtractJsonValue(Params, 'x2'), 0);
    Y2 := StrToIntDef(ExtractJsonValue(Params, 'y2'), 0);

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Rect := SchServer.SchObjectFactory(eRectangle, eCreate_Default);
    If Rect <> Nil Then
    Begin
        { Read-modify-write the TLocation record; direct `.X := value` on the }
        { Location property is a write to a record COPY and is silently       }
        { discarded (the rect retains its default 0,0 / 500,500 from the      }
        { factory). Same fix is applied in Lib_AddSymbolLine and Generic.pas. }
        Loc := Rect.Location;
        Loc.X := MilsToCoord(X1);
        Loc.Y := MilsToCoord(Y1);
        Rect.Location := Loc;
        Loc := Rect.Corner;
        Loc.X := MilsToCoord(X2);
        Loc.Y := MilsToCoord(Y2);
        Rect.Corner := Loc;
        Rect.IsSolid := False;

        SchServer.ProcessControl.PreProcess(SchLib, '');
        SetOwnerPart(Rect, Component);
        Component.AddSchObject(Rect);
        SchRegisterObject(Component, Rect);
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

        MarkLibDirty(SchLib);
        Try SchLib.GraphicallyInvalidate; Except End;
        Result := BuildSuccessResponse(RequestId, '{"success":true}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create rectangle');
End;

Function Lib_AddSymbolLine(Params : String; RequestId : String) : String;
Var
    X1, Y1, X2, Y2, Width : Integer;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Line : ISch_Line;
    Loc : TLocation;
Begin
    X1 := StrToIntDef(ExtractJsonValue(Params, 'x1'), 0);
    Y1 := StrToIntDef(ExtractJsonValue(Params, 'y1'), 0);
    X2 := StrToIntDef(ExtractJsonValue(Params, 'x2'), 0);
    Y2 := StrToIntDef(ExtractJsonValue(Params, 'y2'), 0);
    Width := StrToIntDef(ExtractJsonValue(Params, 'width'), 1);
    If Width < 0 Then Width := 0;
    If Width > 3 Then Width := 3;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Line := SchServer.SchObjectFactory(eLine, eCreate_Default);
    If Line <> Nil Then
    Begin
        { Read-modify-write -- direct `Line.Location.X := value` writes to a }
        { record copy and is silently discarded, leaving the line at its     }
        { default 0,0 / 0,0 (zero-length, invisible, not added to the        }
        { component). Confirmed broken 2026-05-16 when 12 lib_add_symbol_line }
        { calls all reported success but no eLine objects were on the symbol. }
        Loc := Line.Location;
        Loc.X := MilsToCoord(X1);
        Loc.Y := MilsToCoord(Y1);
        Line.Location := Loc;
        Loc := Line.Corner;
        Loc.X := MilsToCoord(X2);
        Loc.Y := MilsToCoord(Y2);
        Line.Corner := Loc;
        Line.LineWidth := Width;

        SchServer.ProcessControl.PreProcess(SchLib, '');
        SetOwnerPart(Line, Component);
        Component.AddSchObject(Line);
        SchRegisterObject(Component, Line);
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

        MarkLibDirty(SchLib);
        { Force the lib editor to redraw -- without this, primitives are    }
        { committed but not visible until the user closes and reopens the   }
        { symbol. Same fix applied to other lib_add_symbol_* helpers.       }
        Try SchLib.GraphicallyInvalidate; Except End;
        Result := BuildSuccessResponse(RequestId, '{"success":true}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create line');
End;

Function Lib_CreateFootprint(Params : String; RequestId : String) : String;
Var
    Name, Description : String;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
Begin
    Name := ExtractJsonValue(Params, 'name');
    Description := ExtractJsonValue(Params, 'description');

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB', 'No PCB library is active');
        Exit;
    End;

    Footprint := PCBServer.CreatePCBLibComp;
    If Footprint <> Nil Then
    Begin
        Footprint.Name := Name;
        Footprint.Description := Description;

        PcbLib.RegisterComponent(Footprint);
        PcbLib.CurrentComponent := Footprint;

        Result := BuildSuccessResponse(RequestId, '{"success":true,"name":"' + EscapeJsonString(Name) + '"}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create footprint');
End;

Function Lib_AddFootprintPad(Params : String; RequestId : String) : String;
Var
    Designator, Shape, LayerStr : String;
    X, Y, XSize, YSize, HoleSize : Integer;
    Rotation : Double;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
    Pad : IPCB_Pad;
Begin
    Designator := ExtractJsonValue(Params, 'designator');
    X := StrToIntDef(ExtractJsonValue(Params, 'x'), 0);
    Y := StrToIntDef(ExtractJsonValue(Params, 'y'), 0);
    XSize := StrToIntDef(ExtractJsonValue(Params, 'x_size'), 60);
    YSize := StrToIntDef(ExtractJsonValue(Params, 'y_size'), 60);
    HoleSize := StrToIntDef(ExtractJsonValue(Params, 'hole_size'), 0);
    Shape := ExtractJsonValue(Params, 'shape');
    LayerStr := ExtractJsonValue(Params, 'layer');
    Rotation := StrToFloatDef(ExtractJsonValue(Params, 'rotation'), 0);

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB', 'No PCB library is active');
        Exit;
    End;

    Footprint := PcbLib.CurrentComponent;
    If Footprint = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT', 'No footprint is selected');
        Exit;
    End;

    PCBServer.PreProcess;

    Pad := PCBServer.PCBObjectFactory(ePadObject, eNoDimension, eCreate_Default);
    If Pad <> Nil Then
    Begin
        Pad.Name := Designator;
        Pad.X := MilsToCoord(X);
        Pad.Y := MilsToCoord(Y);
        Pad.TopXSize := MilsToCoord(XSize);
        Pad.TopYSize := MilsToCoord(YSize);
        Pad.HoleSize := MilsToCoord(HoleSize);
        Pad.Rotation := Rotation;

        If Shape = 'rectangular' Then Pad.TopShape := eRectangular
        Else If Shape = 'octagonal' Then Pad.TopShape := eOctagonal
        Else Pad.TopShape := eRounded;

        Footprint.AddPCBObject(Pad);

        Result := BuildSuccessResponse(RequestId, '{"success":true,"designator":"' + EscapeJsonString(Designator) + '"}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create pad');

    PCBServer.PostProcess;
    SaveDocByPath(PcbLib.Board.FileName);
End;

Function Lib_AddFootprintTrack(Params : String; RequestId : String) : String;
Var
    X1, Y1, X2, Y2, Width : Integer;
    LayerStr : String;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
    Track : IPCB_Track;
    Layer : TLayer;
Begin
    X1 := StrToIntDef(ExtractJsonValue(Params, 'x1'), 0);
    Y1 := StrToIntDef(ExtractJsonValue(Params, 'y1'), 0);
    X2 := StrToIntDef(ExtractJsonValue(Params, 'x2'), 0);
    Y2 := StrToIntDef(ExtractJsonValue(Params, 'y2'), 0);
    Width := StrToIntDef(ExtractJsonValue(Params, 'width'), 10);
    LayerStr := ExtractJsonValue(Params, 'layer');

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB', 'No PCB library is active');
        Exit;
    End;

    Footprint := PcbLib.CurrentComponent;
    If Footprint = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT', 'No footprint is selected');
        Exit;
    End;

    If LayerStr = 'BottomOverlay' Then Layer := eBottomOverlay
    Else Layer := eTopOverlay;

    PCBServer.PreProcess;

    Track := PCBServer.PCBObjectFactory(eTrackObject, eNoDimension, eCreate_Default);
    If Track <> Nil Then
    Begin
        Track.X1 := MilsToCoord(X1);
        Track.Y1 := MilsToCoord(Y1);
        Track.X2 := MilsToCoord(X2);
        Track.Y2 := MilsToCoord(Y2);
        Track.Width := MilsToCoord(Width);
        Track.Layer := Layer;

        Footprint.AddPCBObject(Track);

        Result := BuildSuccessResponse(RequestId, '{"success":true}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create track');

    PCBServer.PostProcess;
    SaveDocByPath(PcbLib.Board.FileName);
End;

Function Lib_AddFootprintArc(Params : String; RequestId : String) : String;
Var
    XCenter, YCenter, Radius, StartAngle, EndAngle, Width : Integer;
    LayerStr : String;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
    Arc : IPCB_Arc;
    Layer : TLayer;
Begin
    XCenter := StrToIntDef(ExtractJsonValue(Params, 'x_center'), 0);
    YCenter := StrToIntDef(ExtractJsonValue(Params, 'y_center'), 0);
    Radius := StrToIntDef(ExtractJsonValue(Params, 'radius'), 100);
    StartAngle := StrToIntDef(ExtractJsonValue(Params, 'start_angle'), 0);
    EndAngle := StrToIntDef(ExtractJsonValue(Params, 'end_angle'), 360);
    Width := StrToIntDef(ExtractJsonValue(Params, 'width'), 10);
    LayerStr := ExtractJsonValue(Params, 'layer');

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB', 'No PCB library is active');
        Exit;
    End;

    Footprint := PcbLib.CurrentComponent;
    If Footprint = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT', 'No footprint is selected');
        Exit;
    End;

    If LayerStr = 'BottomOverlay' Then Layer := eBottomOverlay
    Else Layer := eTopOverlay;

    PCBServer.PreProcess;

    Arc := PCBServer.PCBObjectFactory(eArcObject, eNoDimension, eCreate_Default);
    If Arc <> Nil Then
    Begin
        Arc.XCenter := MilsToCoord(XCenter);
        Arc.YCenter := MilsToCoord(YCenter);
        Arc.Radius := MilsToCoord(Radius);
        Arc.StartAngle := StartAngle;
        Arc.EndAngle := EndAngle;
        Arc.LineWidth := MilsToCoord(Width);
        Arc.Layer := Layer;

        Footprint.AddPCBObject(Arc);

        Result := BuildSuccessResponse(RequestId, '{"success":true}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create arc');

    PCBServer.PostProcess;
    SaveDocByPath(PcbLib.Board.FileName);
End;

{ Lib_AddFootprintText - Stamp a text primitive onto a PcbLib footprint.       }
{                                                                              }
{ Trap baked into this handler: in a PcbLib, Footprint.AddPCBObject on its    }
{ own does not register the new primitive properly with the placement editor }
{ -- the text shows up only after a save+reload. The working pattern is to  }
{ add to BOTH the footprint AND the underlying Board, then broadcast        }
{ PCBM_BoardRegisteration to both. We replicate that exactly.               }
{                                                                              }
{ Params:                                                                      }
{   text        (required) - the string to place                              }
{   x, y                   - coordinates in mils, relative to board origin    }
{   size                   - text height in mils (default 50)                 }
{   width                  - stroke width in mils (default 8)                 }
{   rotation               - degrees, default 0                                }
{   layer                  - GetLayerFromString name, default 'TopOverlay'   }
{   use_ttfont=true|false  - default false (stroke font)                      }
{   library_path           - optional .PcbLib to focus first                  }
{   component_name         - optional footprint name; switches active fp     }
Function Lib_AddFootprintText(Params : String; RequestId : String) : String;
Var
    TextStr, LayerStr, CompName, LibPath, FocusedPath, FlagStr, RespJson : String;
    Workspace : IWorkspace;
    Doc : IDocument;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
    Text : IPCB_Text;
    Board : IPCB_Board;
    Iter : IPCB_LibraryIterator;
    Layer : TLayer;
    X, Y, Size, Width, Rotation : Integer;
    UseTTFont : Boolean;
Begin
    TextStr := ExtractJsonValue(Params, 'text');
    If TextStr = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'text is required');
        Exit;
    End;
    X := StrToIntDef(ExtractJsonValue(Params, 'x'), 0);
    Y := StrToIntDef(ExtractJsonValue(Params, 'y'), 0);
    Size := StrToIntDef(ExtractJsonValue(Params, 'size'), 50);
    Width := StrToIntDef(ExtractJsonValue(Params, 'width'), 8);
    Rotation := StrToIntDef(ExtractJsonValue(Params, 'rotation'), 0);
    LayerStr := ExtractJsonValue(Params, 'layer');
    If LayerStr = '' Then LayerStr := 'TopOverlay';
    FlagStr := ExtractJsonValue(Params, 'use_ttfont');
    UseTTFont := (FlagStr = 'true') Or (FlagStr = 'True') Or (FlagStr = '1');
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);
    CompName := ExtractJsonValue(Params, 'component_name');

    If LibPath <> '' Then
    Begin
        Workspace := GetWorkspace;
        If Workspace = Nil Then
        Begin
            Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
            Exit;
        End;
        FocusedPath := '';
        Doc := Workspace.DM_FocusedDocument;
        If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
        If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
        Begin
            ResetParameters;
            AddStringParameter('ObjectKind', 'Document');
            AddStringParameter('FileName', LibPath);
            RunProcess('WorkspaceManager:OpenObject');
        End;
    End;

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB', 'No PCB library is active');
        Exit;
    End;

    { Switch to a named footprint if asked, otherwise use the active one.  }
    If CompName <> '' Then
    Begin
        Footprint := Nil;
        Iter := PcbLib.LibraryIterator_Create;
        Try
            Footprint := Iter.FirstPCBObject;
            While Footprint <> Nil Do
            Begin
                If Footprint.Name = CompName Then Break;
                Footprint := Iter.NextPCBObject;
            End;
        Finally
            PcbLib.LibraryIterator_Destroy(Iter);
        End;
        If Footprint = Nil Then
        Begin
            Result := BuildErrorResponse(RequestId, 'FOOTPRINT_NOT_FOUND',
                'Footprint not found in library: ' + CompName);
            Exit;
        End;
        Try PcbLib.SetState_CurrentComponent(Footprint); Except End;
    End
    Else
        Footprint := PcbLib.CurrentComponent;

    If Footprint = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT',
            'No footprint is selected (pass component_name to choose one)');
        Exit;
    End;

    Board := PcbLib.Board;
    Layer := GetLayerFromString(LayerStr);

    PCBServer.PreProcess;
    Try
        Text := PCBServer.PCBObjectFactory(eTextObject, eNoDimension, eCreate_Default);
        If Text = Nil Then
        Begin
            Result := BuildErrorResponse(RequestId, 'CREATE_FAILED',
                'PCBObjectFactory returned Nil for eTextObject');
            Exit;
        End;
        Text.XLocation := Board.XOrigin + MilsToCoord(X);
        Text.YLocation := Board.YOrigin + MilsToCoord(Y);
        Text.Layer := Layer;
        Text.UseTTFonts := UseTTFont;
        Text.UnderlyingString := TextStr;
        Text.Size := MilsToCoord(Size);
        Text.Width := MilsToCoord(Width);
        Try Text.Rotation := Rotation; Except End;

        { The working pattern: add to footprint AND to its                  }
        { underlying Board, then broadcast registration to both. Footprint  }
        { alone is not enough -- the placement editor will not see the new }
        { primitive until a save+reload.                                    }
        Footprint.AddPCBObject(Text);
        Board.AddPCBObject(Text);
        PCBServer.SendMessageToRobots(Footprint.I_ObjectAddress,
            c_Broadcast, PCBM_BoardRegisteration, Text.I_ObjectAddress);
        PCBServer.SendMessageToRobots(Board.I_ObjectAddress,
            c_Broadcast, PCBM_BoardRegisteration, Text.I_ObjectAddress);
    Finally
        PCBServer.PostProcess;
    End;

    RespJson :=
        '{"success":true' +
        ',"footprint":"' + EscapeJsonString(Footprint.Name) + '"' +
        ',"text":"' + EscapeJsonString(TextStr) + '"' +
        ',"layer":"' + EscapeJsonString(LayerStr) + '"' +
        ',"x":' + IntToStr(X) +
        ',"y":' + IntToStr(Y) + '}';
    Result := BuildSuccessResponse(RequestId, RespJson);
End;

{ Lib_GetFootprints - Enumerate every footprint in the active (or named)     }
{ PcbLib. Mirror of lib_get_components (SchLib) for PCB libraries. Uses the }
{ documented IPCB_LibraryIterator pattern.                                   }
{                                                                              }
{ Params:                                                                      }
{   library_path - optional .PcbLib to focus first; defaults to focused doc. }
Function Lib_GetFootprints(Params : String; RequestId : String) : String;
Var
    LibPath, FocusedPath, FpName, FpDescr, FpsJson, RespJson : String;
    Workspace : IWorkspace;
    Doc : IDocument;
    PcbLib : IPCB_Library;
    Iter : IPCB_LibraryIterator;
    Footprint : IPCB_LibComponent;
    Count : Integer;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;
    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
    If LibPath = '' Then LibPath := FocusedPath;
    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library is active and library_path was not supplied');
        Exit;
    End;
    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;
    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB',
            'Failed to focus PCB library at ' + LibPath);
        Exit;
    End;

    FpsJson := '[';
    Count := 0;
    Iter := PcbLib.LibraryIterator_Create;
    Try
        Footprint := Iter.FirstPCBObject;
        While Footprint <> Nil Do
        Begin
            FpName := '';
            FpDescr := '';
            Try FpName := Footprint.Name; Except End;
            Try FpDescr := Footprint.Description; Except End;
            If Count > 0 Then FpsJson := FpsJson + ',';
            FpsJson := FpsJson +
                '{"name":"' + EscapeJsonString(FpName) + '"' +
                ',"description":"' + EscapeJsonString(FpDescr) + '"}';
            Inc(Count);
            Footprint := Iter.NextPCBObject;
        End;
    Finally
        PcbLib.LibraryIterator_Destroy(Iter);
    End;
    FpsJson := FpsJson + ']';

    RespJson :=
        '{"library_path":"' + EscapeJsonString(LibPath) + '"' +
        ',"count":' + IntToStr(Count) +
        ',"footprints":' + FpsJson + '}';
    Result := BuildSuccessResponse(RequestId, RespJson);
End;

{ Lib_GetFootprintPads - Read the pad geometry of one footprint in the active }
{ (or named) PcbLib, for export (e.g. KiCad .kicad_mod). Coordinates are in   }
{ mils relative to the library origin (the footprint reference point), which  }
{ is the same frame Lib_AddFootprintPad writes in.                            }
{                                                                              }
{ Params:                                                                      }
{   footprint_name - optional; defaults to the library's current component.   }
{   library_path   - optional .PcbLib to focus first; defaults to focused doc.}
{                                                                              }
{ Response: name, pad_count, and a pads array; each pad carries name, x, y,   }
{   size_x, size_y, shape, layer, hole, rotation -- dimensions in mils, angles }
{   in degrees.                                                                }
Function Lib_GetFootprintPads(Params : String; RequestId : String) : String;
Var
    LibPath, FocusedPath, FpWanted, FpName : String;
    ShapeStr, LayerStr, PadsJson, RespJson : String;
    Workspace : IWorkspace;
    Doc : IDocument;
    PcbLib : IPCB_Library;
    Iter : IPCB_LibraryIterator;
    Footprint, Target : IPCB_LibComponent;
    GrpIter : IPCB_GroupIterator;
    Pad : IPCB_Pad;
    XOrg, YOrg : TCoord;
    Count : Integer;
Begin
    FpWanted := ExtractJsonValue(Params, 'footprint_name');
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;
    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
    If LibPath = '' Then LibPath := FocusedPath;
    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library is active and library_path was not supplied');
        Exit;
    End;
    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;
    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB',
            'Failed to focus PCB library at ' + LibPath);
        Exit;
    End;

    { Pick the target footprint: by name if given, else the current one. }
    Target := Nil;
    If FpWanted = '' Then
        Target := PcbLib.CurrentComponent
    Else
    Begin
        Iter := PcbLib.LibraryIterator_Create;
        Try
            Footprint := Iter.FirstPCBObject;
            While Footprint <> Nil Do
            Begin
                FpName := '';
                Try FpName := Footprint.Name; Except End;
                If UpperCase(FpName) = UpperCase(FpWanted) Then
                Begin
                    Target := Footprint;
                    Break;
                End;
                Footprint := Iter.NextPCBObject;
            End;
        Finally
            PcbLib.LibraryIterator_Destroy(Iter);
        End;
    End;

    If Target = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT',
            'Footprint not found: ' + FpWanted);
        Exit;
    End;

    FpName := '';
    Try FpName := Target.Name; Except End;
    XOrg := 0;  YOrg := 0;
    Try XOrg := PcbLib.Board.XOrigin; Except End;
    Try YOrg := PcbLib.Board.YOrigin; Except End;

    PadsJson := '[';
    Count := 0;
    GrpIter := Target.GroupIterator_Create;
    Try
        GrpIter.AddFilter_ObjectSet(MkSet(ePadObject));
        Pad := GrpIter.FirstPCBObject;
        While Pad <> Nil Do
        Begin
            ShapeStr := 'round';
            Try
                If Pad.TopShape = eRectangular Then ShapeStr := 'rectangular'
                Else If Pad.TopShape = eOctagonal Then ShapeStr := 'octagonal'
                Else If Pad.TopShape = eRoundRectangle Then ShapeStr := 'roundrectangle'
                Else ShapeStr := 'round';
            Except End;

            LayerStr := 'top';
            Try
                If (Pad.Layer = eMultiLayer) Or (Pad.HoleSize > 0) Then LayerStr := 'multi'
                Else If Pad.Layer = eBottomLayer Then LayerStr := 'bottom'
                Else LayerStr := 'top';
            Except End;

            If Count > 0 Then PadsJson := PadsJson + ',';
            PadsJson := PadsJson +
                '{"name":"' + EscapeJsonString(Pad.Name) + '"' +
                ',"x":' + IntToStr(CoordToMils(Pad.X - XOrg)) +
                ',"y":' + IntToStr(CoordToMils(Pad.Y - YOrg)) +
                ',"size_x":' + IntToStr(CoordToMils(Pad.TopXSize)) +
                ',"size_y":' + IntToStr(CoordToMils(Pad.TopYSize)) +
                ',"shape":"' + ShapeStr + '"' +
                ',"layer":"' + LayerStr + '"' +
                ',"hole":' + IntToStr(CoordToMils(Pad.HoleSize)) +
                ',"rotation":' + FloatToJsonStr(Pad.Rotation) + '}';
            Inc(Count);
            Pad := GrpIter.NextPCBObject;
        End;
    Finally
        Target.GroupIterator_Destroy(GrpIter);
    End;
    PadsJson := PadsJson + ']';

    RespJson :=
        '{"name":"' + EscapeJsonString(FpName) + '"' +
        ',"pad_count":' + IntToStr(Count) +
        ',"pads":' + PadsJson + '}';
    Result := BuildSuccessResponse(RequestId, RespJson);
End;

Function Lib_LinkFootprint(Params : String; RequestId : String) : String;
Var
    FootprintName, ComponentName : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Impl : ISch_Implementation;
Begin
    FootprintName := ExtractJsonValue(Params, 'footprint_name');
    ComponentName := ExtractJsonValue(Params, 'component_name');

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    { Resolve the target by component_name so the link lands on the intended
      symbol -- the handler previously ignored it and always used the
      last-created component. Fall back to last-created/selected when empty. }
    If ComponentName <> '' Then
        Component := SelectLibComponent(ComponentName)
    Else
        Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'Target component not found (component_name) or nothing selected');
        Exit;
    End;

    { Attach the footprint model via Component.AddSchImplementation -- the
      dedicated factory that creates, owns AND registers the implementation in
      one call. The old SchObjectFactory(eImplementation) + Component.AddSchObject
      path is WRONG for models: ISch_Implementation is not an ISch_GraphicalObject,
      so on AD26 both SetOwnerPart (writing OwnerPartId) and AddSchObject raise a
      modal "Undeclared identifier" that Try/Except cannot catch and WEDGE the
      bridge. }
    Impl := Component.AddSchImplementation;
    If Impl <> Nil Then
    Begin
        Try Impl.ClearAllDatafileLinks; Except End;
        Impl.ModelName := FootprintName;
        Impl.ModelType := cDocKind_PcbLib;
        Try Impl.IsCurrent := True; Except End;
        { The footprint binds by ModelName, resolved from the libraries
          available to the project. Do NOT AddDataFileLink a full .PcbLib path
          here -- it blocks indefinitely on AD26 and wedges the bridge. }

        Result := BuildSuccessResponse(RequestId, '{"success":true,"footprint":"' + EscapeJsonString(FootprintName) + '"}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'LINK_FAILED', 'Failed to link footprint');
End;

{ Lib_Link3DModel - attach a 3D STEP model to a PcbLib FOOTPRINT.              }
{                                                                              }
{ A 3D model in Altium is geometry that lives on the footprint as an          }
{ IPCB_ComponentBody, NOT a name-reference on the schematic symbol. The STEP  }
{ is loaded with ModelFactory_FromFilename and the body added to the          }
{ footprint (canonical AutoSTEPplacer pattern; same PCB object-factory family }
{ as Lib_AddFootprintPad). The previous schematic-side version attached a     }
{ 'PCB3DModel' implementation -- a wrong ModelType (the constant is           }
{ 'PCB3DLib') -- and passed the path to AddDataFileLink, which blocks on AD26.}
{                                                                              }
{ Params: component_name (footprint name; empty = current footprint),         }
{         model_path (.step/.stp file). offset_*/rotation_* are accepted but  }
{         not applied (Altium ignores them on import; set in the editor).     }
Function Lib_Link3DModel(Params : String; RequestId : String) : String;
Var
    ModelPath, ComponentName, FpName : String;
    PcbLib : IPCB_Library;
    Footprint : IPCB_LibComponent;
    Iter : IPCB_LibraryIterator;
    Body : IPCB_ComponentBody;
    Model : IPCB_Model;
Begin
    ModelPath := ExtractJsonValue(Params, 'model_path');
    ModelPath := StringReplace(ModelPath, '\\', '\', -1);
    ComponentName := ExtractJsonValue(Params, 'component_name');

    If (ModelPath = '') Or (Not FileExists(ModelPath)) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_MODEL_FILE',
            'model_path is empty or the file does not exist: ' + ModelPath);
        Exit;
    End;

    PcbLib := PCBServer.GetCurrentPCBLibrary;
    If PcbLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB',
            'No PCB library is active (a 3D body attaches to a PcbLib footprint)');
        Exit;
    End;

    { Select the footprint by name, otherwise use the current one. }
    If ComponentName <> '' Then
    Begin
        Footprint := Nil;
        Iter := PcbLib.LibraryIterator_Create;
        Try
            Footprint := Iter.FirstPCBObject;
            While Footprint <> Nil Do
            Begin
                If Footprint.Name = ComponentName Then Break;
                Footprint := Iter.NextPCBObject;
            End;
        Finally
            PcbLib.LibraryIterator_Destroy(Iter);
        End;
        If Footprint = Nil Then
        Begin
            Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT',
                'Footprint not found in library: ' + ComponentName);
            Exit;
        End;
        Try PcbLib.SetState_CurrentComponent(Footprint); Except End;
    End
    Else
        Footprint := PcbLib.CurrentComponent;

    If Footprint = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_FOOTPRINT',
            'No footprint selected (pass component_name to choose one)');
        Exit;
    End;
    FpName := '';
    Try FpName := Footprint.Name; Except End;

    PCBServer.PreProcess;
    Try
        Body := PCBServer.PCBObjectFactory(eComponentBodyObject, eNoDimension, eCreate_Default);
        If Body = Nil Then
            Result := BuildErrorResponse(RequestId, 'CREATE_FAILED',
                'PCBObjectFactory returned Nil for eComponentBodyObject')
        Else
        Begin
            { Load the STEP geometry, then bind + add (AutoSTEPplacer order). }
            Model := Body.ModelFactory_FromFilename(ModelPath, False);
            If Model = Nil Then
                Result := BuildErrorResponse(RequestId, 'MODEL_LOAD_FAILED',
                    'Could not load 3D model from ' + ModelPath)
            Else
            Begin
                Body.SetState_FromModel;
                Body.Model := Model;
                Footprint.AddPCBObject(Body);
                Result := BuildSuccessResponse(RequestId,
                    '{"success":true,"footprint":"' + EscapeJsonString(FpName) +
                    '","model":"' + EscapeJsonString(ExtractFileName(ModelPath)) + '"}');
            End;
        End;
    Finally
        PCBServer.PostProcess;
    End;

    SaveDocByPath(PcbLib.Board.FileName);
End;

Function Lib_GetComponents(Params : String; RequestId : String) : String;
Var
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    ParamIterator : ISch_Iterator;
    Param : ISch_Parameter;
    Impl : ISch_Implementation;
    Workspace : IWorkspace;
    Doc : IDocument;
    LibPath, Data, CompName, ParamList, WithParamsStr : String;
    ParamLower, ParamText, WithDesigStr, DefDesig : String;
    Mpn, Manufacturer, Datasheet, FootprintName : String;
    CompNum, I : Integer;
    First, WithParams, WithDesignator : Boolean;
Begin
    // Get library path from parameter or active document
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);

    // Optional flag: dump parameters per component. Default is FALSE because
    // GetState_SchComponentByLibRef + parameter iterator runs O(N) and is the
    // bottleneck on large libraries (a 400+ component standard lib takes
    // tens of seconds with parameters on, sub-second without). Callers that
    // need parameters for a specific symbol should use lib_get_component_details.
    WithParamsStr := ExtractJsonValue(Params, 'with_parameters');
    WithParams := (WithParamsStr = 'true') Or (WithParamsStr = 'True') Or (WithParamsStr = '1');

    // Optional lean flag: emit each component's DEFAULT designator
    // (Component.Designator.Text, e.g. "U?" / "R?" / "IC?"). Like
    // with_parameters it must load the live symbol via
    // GetState_SchComponentByLibRef (the CompInfoReader fast path does NOT
    // expose the designator), but it skips parameter iteration so the
    // payload stays small -- intended for library-wide designator audits.
    WithDesigStr := ExtractJsonValue(Params, 'with_designator');
    WithDesignator := (WithDesigStr = 'true') Or (WithDesigStr = 'True') Or (WithDesigStr = '1');

    If LibPath = '' Then
    Begin
        Workspace := GetWorkspace;
        If Workspace <> Nil Then
        Begin
            Doc := Workspace.DM_FocusedDocument;
            If Doc <> Nil Then
            Begin
                // DM_FileName returns just the basename;
                // CreateLibCompInfoReader needs the full path or it
                // silently returns an empty reader (which is exactly the
                // bug that made lib_get_components always report 0).
                Try LibPath := Doc.DM_FullPath; Except End;
                If LibPath = '' Then LibPath := Doc.DM_FileName;
            End;
        End;
    End;

    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY', 'No library path and no active document');
        Exit;
    End;

    // Use CreateLibCompInfoReader to enumerate components. ICompInfoReader is
    // a fast metadata reader, it returns CompName, AliasName, PartCount and
    // Description directly from the lib file without loading every symbol's
    // primitives, so the cheap path scales linearly with file IO.
    LibReader := SchServer.CreateLibCompInfoReader(LibPath);
    If LibReader = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'READER_FAILED', 'Failed to create library reader for: ' + LibPath);
        Exit;
    End;

    LibReader.ReadAllComponentInfo;
    CompNum := LibReader.NumComponentInfos;

    // Only navigate to live components when the caller asked for parameters,
    // otherwise we skip GetState_SchComponentByLibRef entirely.
    SchLib := Nil;
    If WithParams Or WithDesignator Then
        SchLib := SchServer.GetCurrentSchDocument;

    Data := '[';
    First := True;
    For I := 0 To CompNum - 1 Do
    Begin
        If Not First Then Data := Data + ',';
        First := False;
        CompInfo := LibReader.ComponentInfos[I];
        CompName := CompInfo.CompName;

        Data := Data + '{"name":"' + EscapeJsonString(CompName) + '"';
        Try Data := Data + ',"alias_name":"' + EscapeJsonString(CompInfo.AliasName) + '"'; Except End;
        Try Data := Data + ',"part_count":' + IntToStr(CompInfo.PartCount); Except End;
        Data := Data + ',"description":"' + EscapeJsonString(CompInfo.Description) + '"';

        // Slow path, opt-in via with_parameters=true.
        // Atomic-parts contract: when we're already paying for the live
        // component load, harvest mpn / manufacturer / datasheet from the
        // parameter set plus the current implementation's footprint model
        // name so the planner can populate Part directly from inventory.
        If WithParams Or WithDesignator Then
        Begin
            ParamList := '';
            Mpn := '';
            Manufacturer := '';
            Datasheet := '';
            FootprintName := '';
            DefDesig := '';
            If (SchLib <> Nil) And (SchLib.ObjectId = eSchLib) Then
            Begin
                Component := SchLib.GetState_SchComponentByLibRef(CompName);
                If (Component <> Nil) And WithDesignator Then
                    Try DefDesig := Component.Designator.Text; Except End;
                If (Component <> Nil) And WithParams Then
                Begin
                    ParamIterator := Component.SchIterator_Create;
                    ParamIterator.AddFilter_ObjectSet(MkSet(eParameter));
                    Param := ParamIterator.FirstSchObject;
                    While Param <> Nil Do
                    Begin
                        If ParamList <> '' Then ParamList := ParamList + ',';
                        ParamText := Param.Text;
                        ParamList := ParamList + '"' + EscapeJsonString(Param.Name) + '":"' + EscapeJsonString(ParamText) + '"';
                        // Capture atomic-parts fields by canonical Altium
                        // parameter names. LowerCase makes us tolerant of
                        // libs that capitalize "MPN" vs "Mpn", etc.
                        ParamLower := LowerCase(Param.Name);
                        If (Mpn = '') And ((ParamLower = 'manufacturer part number')
                            Or (ParamLower = 'manufacturerpartnumber')
                            Or (ParamLower = 'mpn')
                            Or (ParamLower = 'part number')
                            Or (ParamLower = 'partnumber')) Then
                            Mpn := ParamText;
                        If (Manufacturer = '') And ((ParamLower = 'manufacturer')
                            Or (ParamLower = 'mfr')
                            Or (ParamLower = 'mfg')) Then
                            Manufacturer := ParamText;
                        If (Datasheet = '') And ((ParamLower = 'datasheet')
                            Or (ParamLower = 'datasheeturl')
                            Or (ParamLower = 'datasheet url')
                            Or (ParamLower = 'componentlink1url')) Then
                            Datasheet := ParamText;
                        Param := ParamIterator.NextSchObject;
                    End;
                    Component.SchIterator_Destroy(ParamIterator);

                    // First implementation = the linked footprint model
                    // (see Lib_LinkFootprint, which writes Impl.ModelName).
                    // Nil when the symbol has zero implementations.
                    Impl := GetFirstSchImplementation(Component);
                    If Impl <> Nil Then
                        Try FootprintName := Impl.ModelName; Except End;
                End;
            End;
            If WithDesignator Then
                Data := Data + ',"designator":"' + EscapeJsonString(DefDesig) + '"';
            If WithParams Then
            Begin
                Data := Data + ',"parameters":{' + ParamList + '}';
                Data := Data + ',"mpn":"' + EscapeJsonString(Mpn) + '"';
                Data := Data + ',"manufacturer":"' + EscapeJsonString(Manufacturer) + '"';
                Data := Data + ',"datasheet":"' + EscapeJsonString(Datasheet) + '"';
                Data := Data + ',"footprint":"' + EscapeJsonString(FootprintName) + '"';
            End;
        End;
        Data := Data + '}';
    End;

    SchServer.DestroyCompInfoReader(LibReader);
    Data := Data + ']';

    Result := BuildSuccessResponse(RequestId, '{"count":' + IntToStr(CompNum) + ',"components":' + Data + '}');
End;

{ Lib_Search - case-insensitive substring search over all open SchLib docs. }
{ The previous implementation invoked Client:FindComponent, which only       }
{ pops the interactive Find Component panel and returns no data, so the     }
{ tool was unusable from an LLM. This handler enumerates SchLib members of  }
{ every workspace project plus the synthetic FreeDocumentsProject (where    }
{ standalone libraries live), opens an ILibCompInfoReader per file (fast,   }
{ no live-component load) and matches CompName / Description / AliasName   }
{ against the query.                                                         }
{                                                                              }
{ Params:                                                                     }
{   query        - substring (case-insensitive). Required.                   }
{   search_type  - 'all' (default) | 'name' | 'description' | 'parameters'. }
{                  'all' tests name + description + alias. 'parameters'     }
{                  also loads each candidate live (slow on big libs).        }
{   library_path - optional, restrict the search to a single .SchLib file.  }
{   limit        - max matches (default 100).                                }
{ Returns a JSON array of [name, alias_name, description, library_path,    }
{ part_count] per match.                                                    }
Function SearchOneLibrary(LibPath, Query, SearchType : String;
    SearchParams : Boolean; SchLib : ISch_Lib;
    Var ResultsJson : String; Var First : Boolean;
    Var Count : Integer; Limit : Integer) : Boolean;
Var
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    Component : ISch_Component;
    ParamIterator : ISch_Iterator;
    Param : ISch_Parameter;
    LowerQuery, CompName, AliasName, Description : String;
    LowerName, LowerAlias, LowerDesc : String;
    NumComps, I : Integer;
    Matched, MatchedParam : Boolean;
Begin
    Result := False;
    LowerQuery := LowerCase(Query);

    LibReader := SchServer.CreateLibCompInfoReader(LibPath);
    If LibReader = Nil Then Exit;

    Try
        LibReader.ReadAllComponentInfo;
        NumComps := LibReader.NumComponentInfos;

        For I := 0 To NumComps - 1 Do
        Begin
            If Count >= Limit Then Break;

            CompInfo := LibReader.ComponentInfos[I];
            CompName := '';
            AliasName := '';
            Description := '';
            Try CompName := CompInfo.CompName; Except End;
            Try AliasName := CompInfo.AliasName; Except End;
            Try Description := CompInfo.Description; Except End;

            LowerName := LowerCase(CompName);
            LowerAlias := LowerCase(AliasName);
            LowerDesc := LowerCase(Description);

            Matched := False;
            If SearchType = 'name' Then
                Matched := Pos(LowerQuery, LowerName) > 0
            Else If SearchType = 'description' Then
                Matched := Pos(LowerQuery, LowerDesc) > 0
            Else
            Begin
                { 'all' / 'parameters' both check name + alias + description }
                { up front. parameters then drops to the slow path on miss. }
                Matched := (Pos(LowerQuery, LowerName) > 0)
                    Or (Pos(LowerQuery, LowerAlias) > 0)
                    Or (Pos(LowerQuery, LowerDesc) > 0);
            End;

            { Slow path, opt-in only via search_type='parameters'. Loads the }
            { live component and walks every parameter's name/value, that's }
            { what makes parameter-search expensive. }
            If (Not Matched) And SearchParams And (SchLib <> Nil) Then
            Begin
                Component := SchLib.GetState_SchComponentByLibRef(CompName);
                If Component <> Nil Then
                Begin
                    MatchedParam := False;
                    ParamIterator := Component.SchIterator_Create;
                    ParamIterator.AddFilter_ObjectSet(MkSet(eParameter));
                    Try
                        Param := ParamIterator.FirstSchObject;
                        While (Param <> Nil) And (Not MatchedParam) Do
                        Begin
                            If (Pos(LowerQuery, LowerCase(Param.Name)) > 0)
                                Or (Pos(LowerQuery, LowerCase(Param.Text)) > 0) Then
                                MatchedParam := True;
                            Param := ParamIterator.NextSchObject;
                        End;
                    Finally
                        Component.SchIterator_Destroy(ParamIterator);
                    End;
                    Matched := MatchedParam;
                End;
            End;

            If Matched Then
            Begin
                If Not First Then ResultsJson := ResultsJson + ',';
                First := False;
                ResultsJson := ResultsJson +
                    '{"name":"' + EscapeJsonString(CompName) +
                    '","alias_name":"' + EscapeJsonString(AliasName) +
                    '","description":"' + EscapeJsonString(Description) +
                    '","library_path":"' + EscapeJsonString(LibPath) +
                    '","part_count":' + IntToStr(CompInfo.PartCount) + '}';
                Inc(Count);
            End;
        End;
    Finally
        SchServer.DestroyCompInfoReader(LibReader);
    End;

    Result := True;
End;

Function Lib_Search(Params : String; RequestId : String) : String;
Var
    Query, SearchType, LibPathFilter : String;
    Workspace : IWorkspace;
    Project : IProject;
    Doc : IDocument;
    FocusedSchLib : ISch_Lib;
    DocPath, ResultsJson : String;
    I, J, Count, Limit : Integer;
    First, IsLib, SearchParams : Boolean;
Begin
    Query := ExtractJsonValue(Params, 'query');
    SearchType := ExtractJsonValue(Params, 'search_type');
    LibPathFilter := ExtractJsonValue(Params, 'library_path');
    LibPathFilter := StringReplace(LibPathFilter, '\\', '\', -1);
    Limit := StrToIntDef(ExtractJsonValue(Params, 'limit'), 100);

    If SearchType = '' Then SearchType := 'all';
    SearchParams := SearchType = 'parameters';

    If Query = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'query is required');
        Exit;
    End;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    { Parameter searches need the live component, which only the focused }
    { library exposes. Cache the focused SchLib so SearchOneLibrary can  }
    { pass it through without re-resolving on every match attempt.       }
    FocusedSchLib := Nil;
    If SearchParams Then
    Begin
        Try
            If (SchServer.GetCurrentSchDocument <> Nil)
                And (SchServer.GetCurrentSchDocument.ObjectId = eSchLib) Then
                FocusedSchLib := SchServer.GetCurrentSchDocument;
        Except End;
    End;

    ResultsJson := '';
    First := True;
    Count := 0;

    { Single-library mode short-circuits the workspace walk. }
    If LibPathFilter <> '' Then
        SearchOneLibrary(LibPathFilter, Query, SearchType, SearchParams,
            FocusedSchLib, ResultsJson, First, Count, Limit)
    Else
    Begin
        For I := 0 To Workspace.DM_ProjectCount - 1 Do
        Begin
            If Count >= Limit Then Break;
            Project := Workspace.DM_Projects(I);
            If Project = Nil Then Continue;
            For J := 0 To Project.DM_LogicalDocumentCount - 1 Do
            Begin
                If Count >= Limit Then Break;
                Doc := Project.DM_LogicalDocuments(J);
                If Doc = Nil Then Continue;
                IsLib := False;
                Try
                    DocPath := Doc.DM_FullPath;
                    IsLib := (UpperCase(Doc.DM_DocumentKind) = 'SCHLIB')
                        Or (Pos('.SCHLIB', UpperCase(DocPath)) > 0);
                Except End;
                If Not IsLib Then Continue;
                SearchOneLibrary(DocPath, Query, SearchType, SearchParams,
                    FocusedSchLib, ResultsJson, First, Count, Limit);
            End;
        End;

        { Free documents (libraries opened standalone, not in any project) }
        Try
            Project := Workspace.DM_FreeDocumentsProject;
            If Project <> Nil Then
            Begin
                For J := 0 To Project.DM_LogicalDocumentCount - 1 Do
                Begin
                    If Count >= Limit Then Break;
                    Doc := Project.DM_LogicalDocuments(J);
                    If Doc = Nil Then Continue;
                    IsLib := False;
                    Try
                        DocPath := Doc.DM_FullPath;
                        IsLib := (UpperCase(Doc.DM_DocumentKind) = 'SCHLIB')
                            Or (Pos('.SCHLIB', UpperCase(DocPath)) > 0);
                    Except End;
                    If Not IsLib Then Continue;
                    SearchOneLibrary(DocPath, Query, SearchType, SearchParams,
                        FocusedSchLib, ResultsJson, First, Count, Limit);
                End;
            End;
        Except End;
    End;

    Result := BuildSuccessResponse(RequestId,
        '{"query":"' + EscapeJsonString(Query) +
        '","search_type":"' + EscapeJsonString(SearchType) +
        '","count":' + IntToStr(Count) +
        ',"limit":' + IntToStr(Limit) +
        ',"truncated":' + BoolToJsonStr(Count >= Limit) +
        ',"results":[' + ResultsJson + ']}');
End;

{ Lib_GetComponentDetails - full inspection of one library component.        }
{ Returns metadata (name, description, part_count, alias_name) PLUS pins,    }
{ parameters, and full visual-style records for the designator, the comment, }
{ and every parameter (font_id, color, is_hidden, x, y, orientation,        }
{ justification). FontId can be expanded into a (name, size, bold, italic)  }
{ record by calling get_font_spec; we pass it through as an integer here    }
{ here so the cost stays on the caller when style detail isn't needed.       }
{                                                                              }
{ Pins/parameters require loading the live ISch_Component, which only the    }
{ SchLib editor can produce, so the target library must be the focused       }
{ SchServer document. If the caller passed a library_path that doesn't       }
{ match the focused doc, we open it via WorkspaceManager:OpenObject before   }
{ resolving. Saves are deferred (see MarkLibDirty), so opening doesn't       }
{ disturb in-flight edits on other libs.                                     }
{                                                                              }
{ Schema breaks vs the previous version (introduced two commits ago):        }
{   designator_prefix (str) -> designator (object: text, font_id, color,    }
{                              is_hidden, x, y, orientation, justification) }
{   pins[].font_id, color, label_hidden added                                }
{   comment (object) added                                                   }
{   parameter_styles (array, parallel to parameters dict) added              }

{ BuildLabelStyleJson reads visual-style props off any ISch_Label-derived    }
{ object (Designator, Comment, Parameter, NetLabel, ...) using late-bound   }
{ accessors. Each access is wrapped in Try/Except since not every property  }
{ is present on every ISch_Label subtype, and DelphiScript fails at runtime }
{ rather than compile time on a missing late-bound property.                 }
Function BuildLabelStyleJson(Lbl : ISch_Label; IncludeText : Boolean) : String;
Var
    Txt : String;
    FontId, ColorVal, OrientVal, JustVal, LocX, LocY : Integer;
    HiddenVal : Boolean;
Begin
    Txt := '';
    FontId := 0;
    ColorVal := 0;
    OrientVal := 0;
    JustVal := 0;
    LocX := 0;
    LocY := 0;
    HiddenVal := False;
    Try Txt := Lbl.Text; Except End;
    Try FontId := Lbl.FontId; Except End;
    Try ColorVal := Lbl.Color; Except End;
    Try HiddenVal := Lbl.IsHidden; Except End;
    Try LocX := CoordToMils(Lbl.Location.X); Except End;
    Try LocY := CoordToMils(Lbl.Location.Y); Except End;
    Try OrientVal := Lbl.Orientation; Except End;
    Try JustVal := Lbl.Justification; Except End;

    Result := '{';
    If IncludeText Then
        Result := Result + '"text":"' + EscapeJsonString(Txt) + '",';
    Result := Result +
        '"font_id":' + IntToStr(FontId) +
        ',"color":' + IntToStr(ColorVal) +
        ',"is_hidden":' + BoolToJsonStr(HiddenVal) +
        ',"x":' + IntToStr(LocX) +
        ',"y":' + IntToStr(LocY) +
        ',"orientation":' + IntToStr(OrientVal) +
        ',"justification":' + IntToStr(JustVal) + '}';
End;

Function Lib_GetComponentDetails(Params : String; RequestId : String) : String;
Var
    ComponentName, LibPath, FocusedPath : String;
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    Workspace : IWorkspace;
    Doc : IDocument;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    PinIterator, ParamIterator : ISch_Iterator;
    Pin : ISch_Pin;
    Param : ISch_Parameter;
    CompNum, I, PinCount : Integer;
    Data, PinList, ParamList, StyleList, ElecStr : String;
    DesignatorJson, CommentJson, Description, AliasName : String;
    PartCount : Integer;
    PinLabelHidden : Boolean;
    First, FirstStyle, FoundInfo : Boolean;
Begin
    ComponentName := ExtractJsonValue(Params, 'component_name');
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);

    If ComponentName = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'component_name is required');
        Exit;
    End;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    { Resolve the focused doc's path so we know whether to reopen. }
    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then
        Try FocusedPath := Doc.DM_FullPath; Except End;

    If LibPath = '' Then
        LibPath := FocusedPath;

    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library document is active and no library_path was supplied');
        Exit;
    End;

    { Bring the requested library into focus when it isn't already. }
    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
            'Failed to focus library at ' + LibPath);
        Exit;
    End;

    { Cheap metadata lookup via CompInfoReader: the live component carries }
    { LibReference / ComponentDescription too, but PartCount is on the    }
    { reader's IComponentInfo and not on ISch_Component, so we fetch it   }
    { here. }
    Description := '';
    AliasName := '';
    PartCount := 1;
    FoundInfo := False;
    LibReader := SchServer.CreateLibCompInfoReader(LibPath);
    If LibReader <> Nil Then
    Begin
        Try
            LibReader.ReadAllComponentInfo;
            CompNum := LibReader.NumComponentInfos;
            For I := 0 To CompNum - 1 Do
            Begin
                CompInfo := LibReader.ComponentInfos[I];
                If CompInfo.CompName = ComponentName Then
                Begin
                    Try Description := CompInfo.Description; Except End;
                    Try AliasName := CompInfo.AliasName; Except End;
                    Try PartCount := CompInfo.PartCount; Except End;
                    FoundInfo := True;
                    Break;
                End;
            End;
        Finally
            SchServer.DestroyCompInfoReader(LibReader);
        End;
    End;

    Component := SchLib.GetState_SchComponentByLibRef(ComponentName);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'COMPONENT_NOT_FOUND',
            'Component not found in library: ' + ComponentName);
        Exit;
    End;

    If Description = '' Then
        Try Description := Component.ComponentDescription; Except End;

    { Designator + Comment full-style records. The sub-objects ARE        }
    { ISch_Label-derived so they expose Text + FontId + Color + IsHidden  }
    { + Location + Orientation + Justification.                            }
    DesignatorJson := '{"text":"","font_id":0,"color":0,"is_hidden":false,"x":0,"y":0,"orientation":0,"justification":0}';
    Try DesignatorJson := BuildLabelStyleJson(Component.Designator, True); Except End;
    CommentJson := '{"text":"","font_id":0,"color":0,"is_hidden":false,"x":0,"y":0,"orientation":0,"justification":0}';
    Try CommentJson := BuildLabelStyleJson(Component.Comment, True); Except End;

    { Pin list. font_id / color come from each pin's own ISch_Pin object  }
    { (it inherits from ISch_GraphicalObject which carries both); pin     }
    { name and pin number share that font/color, separate-font handling   }
    { is not exposed cleanly from DelphiScript. label_hidden is the visual}
    { hide-pin-label flag, distinct from pin.IsHidden which hides the pin }
    { from the canvas entirely.                                            }
    PinList := '';
    First := True;
    PinCount := 0;
    PinIterator := Component.SchIterator_Create;
    PinIterator.AddFilter_ObjectSet(MkSet(ePin));
    Try
        Pin := PinIterator.FirstSchObject;
        While Pin <> Nil Do
        Begin
            If Not First Then PinList := PinList + ',';
            First := False;

            If Pin.Electrical = eElectricInput Then ElecStr := 'input'
            Else If Pin.Electrical = eElectricOutput Then ElecStr := 'output'
            Else If Pin.Electrical = eElectricIO Then ElecStr := 'bidirectional'
            Else If Pin.Electrical = eElectricPassive Then ElecStr := 'passive'
            Else If Pin.Electrical = eElectricPower Then ElecStr := 'power'
            Else If Pin.Electrical = eElectricOpenCollector Then ElecStr := 'open_collector'
            Else If Pin.Electrical = eElectricOpenEmitter Then ElecStr := 'open_emitter'
            Else If Pin.Electrical = eElectricHiZ Then ElecStr := 'hiz'
            Else ElecStr := 'passive';

            { Pin label visibility: ISch_Pin.ShowName / ShowDesignator are }
            { the real flags; combine into a single label_hidden when both }
            { are off so the LLM can flag "neither pin name nor number is }
            { drawn". font_id / color are NOT exposed on ISch_Pin in the   }
            { Schematic API at all (only on the ISch_Label family), so we }
            { intentionally omit them from pins[] rather than fake zeros. }
            PinLabelHidden := False;
            Try PinLabelHidden := (Not Pin.ShowName) And (Not Pin.ShowDesignator); Except End;

            PinList := PinList + '{"designator":"' + EscapeJsonString(Pin.Designator) +
                '","name":"' + EscapeJsonString(Pin.Name) +
                '","electrical_type":"' + ElecStr +
                '","x":' + IntToStr(CoordToMils(Pin.Location.X)) +
                ',"y":' + IntToStr(CoordToMils(Pin.Location.Y)) +
                ',"orientation":' + IntToStr(Pin.Orientation) +
                ',"length":' + IntToStr(CoordToMils(Pin.PinLength)) +
                ',"hidden":' + BoolToJsonStr(Pin.IsHidden) +
                ',"label_hidden":' + BoolToJsonStr(PinLabelHidden) + '}';
            Inc(PinCount);

            Pin := PinIterator.NextSchObject;
        End;
    Finally
        Component.SchIterator_Destroy(PinIterator);
    End;

    { Parameter dict (cheap lookups) plus parameter_styles array (visual). }
    { We iterate parameters once and build both shapes in lockstep so the  }
    { kth entry of parameter_styles always matches the kth iteration order.}
    ParamList := '';
    StyleList := '';
    First := True;
    FirstStyle := True;
    ParamIterator := Component.SchIterator_Create;
    ParamIterator.AddFilter_ObjectSet(MkSet(eParameter));
    Try
        Param := ParamIterator.FirstSchObject;
        While Param <> Nil Do
        Begin
            If Not First Then ParamList := ParamList + ',';
            First := False;
            ParamList := ParamList + '"' + EscapeJsonString(Param.Name) +
                '":"' + EscapeJsonString(Param.Text) + '"';

            If Not FirstStyle Then StyleList := StyleList + ',';
            FirstStyle := False;
            StyleList := StyleList + '{"name":"' + EscapeJsonString(Param.Name) +
                '","value":"' + EscapeJsonString(Param.Text) + '","style":' +
                BuildLabelStyleJson(Param, False) + '}';

            Param := ParamIterator.NextSchObject;
        End;
    Finally
        Component.SchIterator_Destroy(ParamIterator);
    End;

    Data := '{"name":"' + EscapeJsonString(ComponentName) + '"';
    Data := Data + ',"library_path":"' + EscapeJsonString(LibPath) + '"';
    Data := Data + ',"designator":' + DesignatorJson;
    Data := Data + ',"comment":' + CommentJson;
    Data := Data + ',"description":"' + EscapeJsonString(Description) + '"';
    Data := Data + ',"alias_name":"' + EscapeJsonString(AliasName) + '"';
    Data := Data + ',"part_count":' + IntToStr(PartCount);
    Data := Data + ',"pin_count":' + IntToStr(PinCount);
    Data := Data + ',"pins":[' + PinList + ']';
    Data := Data + ',"parameters":{' + ParamList + '}';
    Data := Data + ',"parameter_styles":[' + StyleList + ']}';

    Result := BuildSuccessResponse(RequestId, Data);
End;

Function Lib_BatchSetParams(Params : String; RequestId : String) : String;
Var
    LibPath, BatchPath : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    ParamIterator : ISch_Iterator;
    Param : ISch_Parameter;
    NewParam : ISch_Parameter;
    FoundParam : ISch_Parameter;
    Workspace : IWorkspace;
    WDoc : IDocument;
    F : TextFile;
    Line, CompName, ParamName, ParamValue : String;
    PipePos1, PipePos2 : Integer;
    Updated, Created, Failed, LineNum : Integer;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);
    BatchPath := ExtractJsonValue(Params, 'batch_file');
    BatchPath := StringReplace(BatchPath, '\\', '\', -1);

    If BatchPath = '' Then
        BatchPath := WorkspaceDir + 'batch_params.txt';

    // Get library path from focused document if not provided
    If LibPath = '' Then
    Begin
        Workspace := GetWorkspace;
        If Workspace <> Nil Then
        Begin
            WDoc := Workspace.DM_FocusedDocument;
            If WDoc <> Nil Then
                LibPath := WDoc.DM_FileName;
        End;
    End;

    // Open the library to make it the current SchServer document
    If LibPath <> '' Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    If Not FileExists(BatchPath) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_BATCH_FILE', 'Batch file not found: ' + BatchPath);
        Exit;
    End;

    Updated := 0;
    Created := 0;
    Failed := 0;
    LineNum := 0;

    // Begin modification block for undo support
    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        AssignFile(F, BatchPath);
        Reset(F);
        Try
            While Not EOF(F) Do
            Begin
                ReadLn(F, Line);
                Inc(LineNum);

                If Line = '' Then Continue;

                // Parse: CompName|ParamName|ParamValue
                PipePos1 := Pos('|', Line);
                If PipePos1 = 0 Then
                Begin
                    Inc(Failed);
                    Continue;
                End;
                CompName := Copy(Line, 1, PipePos1 - 1);
                Line := Copy(Line, PipePos1 + 1, Length(Line));
                PipePos2 := Pos('|', Line);
                If PipePos2 = 0 Then
                Begin
                    Inc(Failed);
                    Continue;
                End;
                ParamName := Copy(Line, 1, PipePos2 - 1);
                ParamValue := Copy(Line, PipePos2 + 1, Length(Line));

                Component := SchLib.GetState_SchComponentByLibRef(CompName);
                If Component = Nil Then
                Begin
                    Inc(Failed);
                    Continue;
                End;

                // Special case: Description is a component property, not a parameter
                If ParamName = 'Description' Then
                Begin
                    Component.ComponentDescription := ParamValue;
                    Inc(Updated);
                    Continue;
                End;

                // Special case: Designator is the component's DEFAULT
                // designator (Component.Designator.Text, a property on the
                // designator label sub-object) -- NOT a parameter. Mirrors
                // the Description case. Lets library designator audits
                // normalize defaults (e.g. "IC?" / "U3" -> "U?") through the
                // existing batch tool without a dedicated handler.
                If ParamName = 'Designator' Then
                Begin
                    If Component.Designator <> Nil Then
                    Begin
                        SchBeginModify(Component.Designator);
                        Component.Designator.Text := ParamValue;
                        SchEndModify(Component.Designator);
                        Inc(Updated);
                    End
                    Else
                        Inc(Failed);
                    Continue;
                End;

                // Find existing parameter
                FoundParam := Nil;
                ParamIterator := Component.SchIterator_Create;
                ParamIterator.AddFilter_ObjectSet(MkSet(eParameter));
                Param := ParamIterator.FirstSchObject;
                While Param <> Nil Do
                Begin
                    If Param.Name = ParamName Then
                    Begin
                        FoundParam := Param;
                        Break;
                    End;
                    Param := ParamIterator.NextSchObject;
                End;
                Component.SchIterator_Destroy(ParamIterator);

                If FoundParam <> Nil Then
                Begin
                    SchBeginModify(FoundParam);
                    FoundParam.Text := ParamValue;
                    SchEndModify(FoundParam);
                    Inc(Updated);
                End
                Else
                Begin
                    NewParam := SchServer.SchObjectFactory(eParameter, eCreate_Default);
                    If NewParam <> Nil Then
                    Begin
                        NewParam.Name := ParamName;
                        NewParam.Text := ParamValue;
                        SetOwnerPart(NewParam, Component);
                        Component.AddSchObject(NewParam);
                        SchRegisterObject(Component, NewParam);
                        Inc(Created);
                    End
                    Else
                        Inc(Failed);
                End;
            End;
        Finally
            CloseFile(F);
        End;
    Finally
        // End modification block - commit changes
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
    End;

    MarkLibDirty(SchLib);
    Result := BuildSuccessResponse(RequestId,
        '{"updated":' + IntToStr(Updated) +
        ',"created":' + IntToStr(Created) +
        ',"failed":' + IntToStr(Failed) +
        ',"total_lines":' + IntToStr(LineNum) + '}');
End;

{..............................................................................}
{ Batch Rename Components                                                      }
{..............................................................................}

Function Lib_BatchRename(Params : String; RequestId : String) : String;
Var
    LibPath, BatchPath : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Workspace : IWorkspace;
    Doc : IDocument;
    ServerDoc : IServerDocument;
    F : TextFile;
    Line, OldName, NewName : String;
    PipePos : Integer;
    Renamed, Failed, LineNum : Integer;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);
    BatchPath := ExtractJsonValue(Params, 'batch_file');
    BatchPath := StringReplace(BatchPath, '\\', '\', -1);
    If BatchPath = '' Then
        BatchPath := WorkspaceDir + 'batch_rename.txt';

    // Get library path from parameter or focused document
    If LibPath = '' Then
    Begin
        Workspace := GetWorkspace;
        If Workspace <> Nil Then
        Begin
            Doc := Workspace.DM_FocusedDocument;
            If Doc <> Nil Then
                LibPath := Doc.DM_FileName;
        End;
    End;

    // Focus the library document to make it the current SchServer document
    If LibPath <> '' Then
    Begin
        ServerDoc := Client.GetDocumentByPath(LibPath);
        If ServerDoc <> Nil Then
            Client.ShowDocument(ServerDoc)
        Else
        Begin
            // Not yet open, open it
            ResetParameters;
            AddStringParameter('ObjectKind', 'Document');
            AddStringParameter('FileName', LibPath);
            RunProcess('WorkspaceManager:OpenObject');
        End;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active. Provide library_path parameter.');
        Exit;
    End;

    If Not FileExists(BatchPath) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_BATCH_FILE', 'Batch file not found: ' + BatchPath);
        Exit;
    End;

    Renamed := 0;
    Failed := 0;
    LineNum := 0;

    // Begin modification block
    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        AssignFile(F, BatchPath);
        Reset(F);
        Try
            While Not EOF(F) Do
            Begin
                ReadLn(F, Line);
                Inc(LineNum);

                If Line = '' Then Continue;

                // Parse: OldName|NewName
                PipePos := Pos('|', Line);
                If PipePos = 0 Then
                Begin
                    Inc(Failed);
                    Continue;
                End;
                OldName := Copy(Line, 1, PipePos - 1);
                NewName := Copy(Line, PipePos + 1, Length(Line));

                Component := SchLib.GetState_SchComponentByLibRef(OldName);
                If Component = Nil Then
                Begin
                    Inc(Failed);
                    Continue;
                End;

                // Must remove and re-add to update the library's internal index
                SchLib.RemoveSchComponent(Component);
                Component.LibReference := NewName;
                SchLib.AddSchComponent(Component);
                Inc(Renamed);
            End;
        Finally
            CloseFile(F);
        End;
    Finally
        // End modification block - commit changes
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
    End;

    SchLib.GraphicallyInvalidate;
    MarkLibDirty(SchLib);

    Result := BuildSuccessResponse(RequestId,
        '{"renamed":' + IntToStr(Renamed) +
        ',"failed":' + IntToStr(Failed) +
        ',"total_lines":' + IntToStr(LineNum) + '}');
End;

{..............................................................................}
{ Diff two SchLib files, reports components only in A, only in B, or both   }
{..............................................................................}

Function Lib_DiffLibraries(Params : String; RequestId : String) : String;
Var
    PathA, PathB : String;
    ReaderA, ReaderB : ILibCompInfoReader;
    NumA, NumB, I, J : Integer;
    NameA : String;
    FoundInB : Boolean;
    OnlyA, OnlyB, Common : String;
    CountA, CountB, CountCommon : Integer;
    First : Boolean;
Begin
    PathA := ExtractJsonValue(Params, 'library_a');
    PathA := StringReplace(PathA, '\\', '\', -1);
    PathB := ExtractJsonValue(Params, 'library_b');
    PathB := StringReplace(PathB, '\\', '\', -1);

    If (PathA = '') Or (PathB = '') Then
    Begin Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'library_a and library_b are required'); Exit; End;

    ReaderA := SchServer.CreateLibCompInfoReader(PathA);
    If ReaderA = Nil Then Begin Result := BuildErrorResponse(RequestId, 'READER_FAILED', 'Cannot read library A'); Exit; End;
    ReaderA.ReadAllComponentInfo;
    NumA := ReaderA.NumComponentInfos;

    ReaderB := SchServer.CreateLibCompInfoReader(PathB);
    If ReaderB = Nil Then
    Begin
        SchServer.DestroyCompInfoReader(ReaderA);
        Result := BuildErrorResponse(RequestId, 'READER_FAILED', 'Cannot read library B');
        Exit;
    End;
    ReaderB.ReadAllComponentInfo;
    NumB := ReaderB.NumComponentInfos;

    OnlyA := '';  CountA := 0;
    OnlyB := '';  CountB := 0;
    Common := ''; CountCommon := 0;

    // Find components in A: check if each exists in B
    For I := 0 To NumA - 1 Do
    Begin
        NameA := ReaderA.ComponentInfos[I].CompName;
        FoundInB := False;
        For J := 0 To NumB - 1 Do
        Begin
            If ReaderB.ComponentInfos[J].CompName = NameA Then Begin FoundInB := True; Break; End;
        End;
        If FoundInB Then
        Begin
            If CountCommon > 0 Then Common := Common + ',';
            Common := Common + '"' + EscapeJsonString(NameA) + '"';
            Inc(CountCommon);
        End
        Else
        Begin
            If CountA > 0 Then OnlyA := OnlyA + ',';
            OnlyA := OnlyA + '"' + EscapeJsonString(NameA) + '"';
            Inc(CountA);
        End;
    End;

    // Find components only in B
    For I := 0 To NumB - 1 Do
    Begin
        NameA := ReaderB.ComponentInfos[I].CompName;
        FoundInB := False;
        For J := 0 To NumA - 1 Do
        Begin
            If ReaderA.ComponentInfos[J].CompName = NameA Then Begin FoundInB := True; Break; End;
        End;
        If Not FoundInB Then
        Begin
            If CountB > 0 Then OnlyB := OnlyB + ',';
            OnlyB := OnlyB + '"' + EscapeJsonString(NameA) + '"';
            Inc(CountB);
        End;
    End;

    SchServer.DestroyCompInfoReader(ReaderA);
    SchServer.DestroyCompInfoReader(ReaderB);

    Result := BuildSuccessResponse(RequestId,
        '{"only_in_a":[' + OnlyA + '],"only_in_b":[' + OnlyB + '],"common":[' + Common + ']' +
        ',"count_a":' + IntToStr(NumA) + ',"count_b":' + IntToStr(NumB) +
        ',"only_a":' + IntToStr(CountA) + ',"only_b":' + IntToStr(CountB) +
        ',"shared":' + IntToStr(CountCommon) + '}');
End;

{..............................................................................}
{ Add an arc to the current library symbol                                    }
{ Params: x_center, y_center, radius, start_angle, end_angle, width          }
{..............................................................................}

Function Lib_AddSymbolArc(Params : String; RequestId : String) : String;
Var
    XCenter, YCenter, Radius, StartAngle, EndAngle, Width : Integer;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Arc : ISch_Arc;
Begin
    XCenter := StrToIntDef(ExtractJsonValue(Params, 'x_center'), 0);
    YCenter := StrToIntDef(ExtractJsonValue(Params, 'y_center'), 0);
    Radius := StrToIntDef(ExtractJsonValue(Params, 'radius'), 100);
    StartAngle := StrToIntDef(ExtractJsonValue(Params, 'start_angle'), 0);
    EndAngle := StrToIntDef(ExtractJsonValue(Params, 'end_angle'), 360);
    Width := StrToIntDef(ExtractJsonValue(Params, 'width'), 1);
    If Width < 0 Then Width := 0;
    If Width > 3 Then Width := 3;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Arc := SchServer.SchObjectFactory(eArc, eCreate_Default);
    If Arc <> Nil Then
    Begin
        Arc.Location := Point(MilsToCoord(XCenter), MilsToCoord(YCenter));
        Arc.Radius := MilsToCoord(Radius);
        Arc.StartAngle := StartAngle;
        Arc.EndAngle := EndAngle;
        Arc.LineWidth := Width;

        SchServer.ProcessControl.PreProcess(SchLib, '');
        SetOwnerPart(Arc, Component);
        Component.AddSchObject(Arc);
        SchRegisterObject(Component, Arc);
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

        MarkLibDirty(SchLib);
        Result := BuildSuccessResponse(RequestId, '{"success":true}');
    End
    Else
        Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create arc');
End;

{..............................................................................}
{ Add a polygon (filled shape) to the current library symbol                  }
{ Params: vertices (comma-separated x,y pairs: "x1,y1,x2,y2,x3,y3,...")     }
{..............................................................................}

Function Lib_AddSymbolPolygon(Params : String; RequestId : String) : String;
Var
    VerticesStr, Token : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Polygon : ISch_Polygon;
    Remaining : String;
    CommaPos, X, Y, I : Integer;
    { Parallel TStringLists of stringified coords. Fixed-size local arrays }
    { of any type corrupt the return slot, see                              }
    { [[delphiscript_fixed_string_array_bug]] - originally documented for  }
    { Array of String, now confirmed for Array of Integer/Double too.      }
    XValues, YValues : TStringList;
Begin
    VerticesStr := ExtractJsonValue(Params, 'vertices');

    If VerticesStr = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'vertices parameter is required');
        Exit;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    XValues := TStringList.Create;
    YValues := TStringList.Create;
    Try
        Remaining := VerticesStr;
        While Remaining <> '' Do
        Begin
            CommaPos := Pos(',', Remaining);
            If CommaPos = 0 Then Break;
            Token := Copy(Remaining, 1, CommaPos - 1);
            Remaining := Copy(Remaining, CommaPos + 1, Length(Remaining));
            X := StrToIntDef(Token, 0);

            CommaPos := Pos(',', Remaining);
            If CommaPos > 0 Then
            Begin
                Token := Copy(Remaining, 1, CommaPos - 1);
                Remaining := Copy(Remaining, CommaPos + 1, Length(Remaining));
            End
            Else
            Begin
                Token := Remaining;
                Remaining := '';
            End;
            Y := StrToIntDef(Token, 0);

            XValues.Add(IntToStr(X));
            YValues.Add(IntToStr(Y));
        End;

        If XValues.Count < 3 Then
        Begin
            Result := BuildErrorResponse(RequestId, 'INVALID_PARAMS', 'At least 3 vertices are required');
            Exit;
        End;

        Polygon := SchServer.SchObjectFactory(ePolygon, eCreate_Default);
        If Polygon <> Nil Then
        Begin
            Polygon.VerticesCount := XValues.Count;
            Polygon.IsSolid := True;
            Polygon.LineWidth := eSmall;

            For I := 1 To XValues.Count Do
                Polygon.Vertex[I] := Point(
                    MilsToCoord(StrToIntDef(XValues[I-1], 0)),
                    MilsToCoord(StrToIntDef(YValues[I-1], 0)));

            SchServer.ProcessControl.PreProcess(SchLib, '');
            SetOwnerPart(Polygon, Component);
            Component.AddSchObject(Polygon);
            SchRegisterObject(Component, Polygon);
            SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

            MarkLibDirty(SchLib);
            Result := BuildSuccessResponse(RequestId,
                '{"success":true,"vertices":' + IntToStr(XValues.Count) + '}');
        End
        Else
            Result := BuildErrorResponse(RequestId, 'CREATE_FAILED', 'Failed to create polygon');
    Finally
        YValues.Free;
        XValues.Free;
    End;
End;

{..............................................................................}
{ Set the description field on a library component                            }
{ Params: component_name, description                                         }
{..............................................................................}

Function Lib_SetComponentDescription(Params : String; RequestId : String) : String;
Var
    CompName, Description : String;
    SchLib : ISch_Lib;
    Component : ISch_Component;
Begin
    CompName := ExtractJsonValue(Params, 'component_name');
    Description := ExtractJsonValue(Params, 'description');

    If CompName = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS', 'component_name parameter is required');
        Exit;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := SchLib.GetState_SchComponentByLibRef(CompName);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'COMPONENT_NOT_FOUND', 'Component not found: ' + CompName);
        Exit;
    End;

    SchServer.ProcessControl.PreProcess(SchLib, '');
    SchBeginModify(Component);
    Component.ComponentDescription := Description;
    SchEndModify(Component);
    SchServer.ProcessControl.PostProcess(SchLib, 'Edit');

    MarkLibDirty(SchLib);
    Result := BuildSuccessResponse(RequestId,
        '{"success":true,"component":"' + EscapeJsonString(CompName) +
        '","description":"' + EscapeJsonString(Description) + '"}');
End;

{..............................................................................}
{ Get all pins of the current library component                               }
{ Returns designator, name, electrical type, x, y for each pin               }
{..............................................................................}

Function Lib_GetPinList(Params : String; RequestId : String) : String;
Var
    SchLib : ISch_Lib;
    Component : ISch_Component;
    PinIterator : ISch_Iterator;
    Pin : ISch_Pin;
    JsonItems, ElecStr : String;
    First : Boolean;
    PinCount : Integer;
Begin
    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    JsonItems := '';
    First := True;
    PinCount := 0;

    PinIterator := Component.SchIterator_Create;
    PinIterator.AddFilter_ObjectSet(MkSet(ePin));

    Try
        Pin := PinIterator.FirstSchObject;
        While Pin <> Nil Do
        Begin
            If Not First Then JsonItems := JsonItems + ',';
            First := False;

            // Map electrical type to string. Altium uses eElectricIO for
            // bidirectional; eElectricBiDir is undeclared.
            If Pin.Electrical = eElectricInput Then ElecStr := 'input'
            Else If Pin.Electrical = eElectricOutput Then ElecStr := 'output'
            Else If Pin.Electrical = eElectricIO Then ElecStr := 'bidirectional'
            Else If Pin.Electrical = eElectricPassive Then ElecStr := 'passive'
            Else If Pin.Electrical = eElectricPower Then ElecStr := 'power'
            Else If Pin.Electrical = eElectricOpenCollector Then ElecStr := 'open_collector'
            Else If Pin.Electrical = eElectricOpenEmitter Then ElecStr := 'open_emitter'
            Else If Pin.Electrical = eElectricHiZ Then ElecStr := 'hiz'
            Else ElecStr := 'passive';

            JsonItems := JsonItems + '{"designator":"' + EscapeJsonString(Pin.Designator) +
                '","name":"' + EscapeJsonString(Pin.Name) +
                '","electrical_type":"' + ElecStr +
                '","x":' + IntToStr(CoordToMils(Pin.Location.X)) +
                ',"y":' + IntToStr(CoordToMils(Pin.Location.Y)) +
                ',"orientation":' + IntToStr(Pin.Orientation) +
                ',"length":' + IntToStr(CoordToMils(Pin.PinLength)) +
                ',"hidden":' + BoolToJsonStr(Pin.IsHidden) + '}';
            Inc(PinCount);

            Pin := PinIterator.NextSchObject;
        End;
    Finally
        Component.SchIterator_Destroy(PinIterator);
    End;

    Result := BuildSuccessResponse(RequestId,
        '{"count":' + IntToStr(PinCount) +
        ',"component":"' + EscapeJsonString(Component.LibReference) +
        '","pins":[' + JsonItems + ']}');
End;

{..............................................................................}
{ Duplicate a component within or BETWEEN schematic libraries.                }
{                                                                              }
{ Params:                                                                      }
{   source_name (required) - lib_ref to copy                                  }
{   new_name              - lib_ref for the clone; defaults to source_name   }
{   source_library        - .SchLib to read from; defaults to focused doc    }
{   dest_library          - .SchLib to write to; defaults to source_library  }
{                           (omit / equal -> same-library duplicate, the     }
{                           original behaviour)                                }
{   overwrite=true|false  - if a component named new_name already exists in  }
{                           the destination, replace it; default false ->    }
{                           returns NAME_EXISTS                                }
{                                                                              }
{ Replicates the source while it is focused (so the clone inherits the       }
{ source's library context), then switches focus to the destination and     }
{ AddSchComponent there. Destination ends focused with the new component     }
{ selected. Save is deferred (MarkLibDirty only) per the project's perf-      }
{ deferred-save pattern.                                                       }
{..............................................................................}

Function Lib_CopyComponent(Params : String; RequestId : String) : String;
Var
    SourceLibPath, DestLibPath, FocusedPath, SourceName, NewName : String;
    OverwriteStr, RespJson : String;
    Workspace : IWorkspace;
    Doc : IDocument;
    SourceLib, DestLib : ISch_Lib;
    SourceComp, NewComp, Existing : ISch_Component;
    Overwrite, SameLib, Overwrote : Boolean;
Begin
    SourceLibPath := ExtractJsonValue(Params, 'source_library');
    SourceLibPath := StringReplace(SourceLibPath, '\\', '\', -1);
    DestLibPath := ExtractJsonValue(Params, 'dest_library');
    DestLibPath := StringReplace(DestLibPath, '\\', '\', -1);
    SourceName := ExtractJsonValue(Params, 'source_name');
    NewName := ExtractJsonValue(Params, 'new_name');
    OverwriteStr := ExtractJsonValue(Params, 'overwrite');
    Overwrite := (OverwriteStr = 'true') Or (OverwriteStr = 'True') Or (OverwriteStr = '1');

    If SourceName = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS',
            'source_name is required');
        Exit;
    End;
    If NewName = '' Then NewName := SourceName;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
    If SourceLibPath = '' Then SourceLibPath := FocusedPath;
    If SourceLibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library is active and source_library was not supplied');
        Exit;
    End;

    { Focus the source library so Replicate sees it in the right context. }
    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(SourceLibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', SourceLibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;
    SourceLib := SchServer.GetCurrentSchDocument;
    If (SourceLib = Nil) Or (SourceLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
            'Failed to focus source library at ' + SourceLibPath);
        Exit;
    End;
    SourceComp := SourceLib.GetState_SchComponentByLibRef(SourceName);
    If SourceComp = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'COMPONENT_NOT_FOUND',
            'Source component not found in ' + SourceLibPath + ': ' + SourceName);
        Exit;
    End;

    SameLib := (DestLibPath = '') Or (UpperCase(DestLibPath) = UpperCase(SourceLibPath));
    If SameLib Then DestLibPath := SourceLibPath;

    { Replicate while source is focused. The clone is free-floating until    }
    { AddSchComponent attaches it to the destination library.                 }
    NewComp := SourceComp.Replicate;
    If NewComp = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'COPY_FAILED',
            'Replicate returned Nil for ' + SourceName);
        Exit;
    End;
    NewComp.LibReference := NewName;

    If SameLib Then
        DestLib := SourceLib
    Else
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', DestLibPath);
        RunProcess('WorkspaceManager:OpenObject');
        DestLib := SchServer.GetCurrentSchDocument;
        If (DestLib = Nil) Or (DestLib.ObjectId <> eSchLib) Then
        Begin
            Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
                'Failed to focus destination library at ' + DestLibPath);
            Exit;
        End;
    End;

    Overwrote := False;
    Existing := DestLib.GetState_SchComponentByLibRef(NewName);
    If Existing <> Nil Then
    Begin
        If Not Overwrite Then
        Begin
            Result := BuildErrorResponse(RequestId, 'NAME_EXISTS',
                'A component named "' + NewName + '" already exists in '
                + DestLibPath + ' (pass overwrite=true to replace)');
            Exit;
        End;
        SchServer.ProcessControl.PreProcess(DestLib, '');
        DestLib.RemoveSchComponent(Existing);
        SchServer.ProcessControl.PostProcess(DestLib, 'Edit');
        Overwrote := True;
    End;

    SchServer.ProcessControl.PreProcess(DestLib, '');
    DestLib.AddSchComponent(NewComp);
    SchServer.ProcessControl.PostProcess(DestLib, 'Edit');
    DestLib.CurrentSchComponent := NewComp;
    MarkLibDirty(DestLib);

    { Stash the response in a local before assigning to Result -- the         }
    { DelphiScript last-String-arg clobber bug only bites here when the       }
    { JSON build calls a String helper, but the pattern is cheap insurance.   }
    RespJson :=
        '{"success":true' +
        ',"source_library":"' + EscapeJsonString(SourceLibPath) + '"' +
        ',"dest_library":"' + EscapeJsonString(DestLibPath) + '"' +
        ',"source":"' + EscapeJsonString(SourceName) + '"' +
        ',"new_name":"' + EscapeJsonString(NewName) + '"' +
        ',"same_library":' + BoolToJsonStr(SameLib) +
        ',"overwrote":' + BoolToJsonStr(Overwrote) + '}';
    Result := BuildSuccessResponse(RequestId, RespJson);
End;

{..............................................................................}
{ Lib_AddPins - Bulk add pins to the currently-selected library component.     }
{ One PreProcess/PostProcess + one save for the whole batch, so adding 50      }
{ pins to a new IC symbol costs ~1x the overhead of adding one pin.           }
{ Params: pins = '~~'-separated list; each pin has key=value fields joined by  }
{         ';'. Fields: designator, name, x, y, length (mils), rotation        }
{         (0/90/180/270), electrical_type (input/output/bidirectional/        }
{         passive/power/open_collector/open_emitter/hiz), hidden (true/false).}
{..............................................................................}

Function Lib_AddPins(Params : String; RequestId : String) : String;
Var
    PinsStr, Op, Remaining : String;
    OpCount, Added, Failed : Integer;
    Designator, Name, ElecType, HiddenStr, OwnerStr : String;
    X, Y, Length, Rotation, OwnerPartId : Integer;
    Hidden, OwnerExplicit : Boolean;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Pin : ISch_Pin;
    Loc : TLocation;
Begin
    PinsStr := ExtractJsonValue(Params, 'pins');
    If PinsStr = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAM', 'pins is required');
        Exit;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Added := 0;
    Failed := 0;
    OpCount := 0;
    Remaining := PinsStr;

    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        While True Do
        Begin
            Op := NextBatchOp(Remaining);
            If Op = '' Then Break;
            OpCount := OpCount + 1;
            Designator := GetBatchField(Op, 'designator');
            Name := GetBatchField(Op, 'name');
            X := StrToIntDef(GetBatchField(Op, 'x'), 0);
            Y := StrToIntDef(GetBatchField(Op, 'y'), 0);
            Length := StrToIntDef(GetBatchField(Op, 'length'), 200);
            Rotation := StrToIntDef(GetBatchField(Op, 'rotation'), 0);
            ElecType := GetBatchField(Op, 'electrical_type');
            HiddenStr := GetBatchField(Op, 'hidden');
            Hidden := (HiddenStr = 'true') Or (HiddenStr = '1');
            { Multi-part support: owner_part_id selects which sub-part      }
            { owns the pin. 0 = shared across ALL parts (e.g. the power     }
            { pins on a quad op-amp). Omit / empty = "current part" via   }
            { SetOwnerPart (single-part behaviour, original default).      }
            OwnerStr := GetBatchField(Op, 'owner_part_id');
            OwnerExplicit := OwnerStr <> '';
            OwnerPartId := StrToIntDef(OwnerStr, 0);

            Pin := SchServer.SchObjectFactory(ePin, eCreate_Default);
            If Pin = Nil Then
            Begin
                Inc(Failed);
                Continue;
            End;

            Pin.Designator := Designator;
            Pin.Name := Name;
            { Location is a by-value record, read, mutate, write back.         }
            Loc := Pin.Location;
            Loc.X := MilsToCoord(X);
            Loc.Y := MilsToCoord(Y);
            Pin.Location := Loc;
            Pin.PinLength := MilsToCoord(Length);
            Pin.Orientation := Rotation Div 90;
            Pin.IsHidden := Hidden;

            Pin.Electrical := StrToPinElectrical(ElecType);

            If OwnerExplicit Then
            Begin
                { Explicit owner_part_id from caller (multi-part symbol).  }
                Try Pin.OwnerPartId := OwnerPartId; Except End;
                Try Pin.OwnerPartDisplayMode := 0; Except End;
            End
            Else
                SetOwnerPart(Pin, Component);

            Component.AddSchObject(Pin);
            SchRegisterObject(Component, Pin);
            Inc(Added);
        End;
    Finally
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
    End;

    MarkLibDirty(SchLib);

    Result := BuildSuccessResponse(RequestId,
        '{"added":' + IntToStr(Added) + ',"failed":' + IntToStr(Failed)
        + ',"total":' + IntToStr(OpCount) + '}');
End;

{ Batch line authoring: same shape as Lib_AddPins. Receives a `lines` array }
{ encoded with the ~~ / ; / = separators NextBatchOp expects, applies them  }
{ all inside one PreProcess / PostProcess pair, and triggers a single       }
{ MarkLibDirty (which now also handles graphical invalidate).               }
Function Lib_AddSymbolLines(Params : String; RequestId : String) : String;
Var
    LinesStr, Op, Remaining : String;
    OpCount, Added, Failed : Integer;
    X1, Y1, X2, Y2, Width : Integer;
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Line : ISch_Line;
    Loc : TLocation;
Begin
    LinesStr := ExtractJsonValue(Params, 'lines');
    If LinesStr = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAM', 'lines is required');
        Exit;
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;

    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No component is selected');
        Exit;
    End;

    Added := 0;
    Failed := 0;
    OpCount := 0;
    Remaining := LinesStr;

    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        While True Do
        Begin
            Op := NextBatchOp(Remaining);
            If Op = '' Then Break;
            OpCount := OpCount + 1;
            X1 := StrToIntDef(GetBatchField(Op, 'x1'), 0);
            Y1 := StrToIntDef(GetBatchField(Op, 'y1'), 0);
            X2 := StrToIntDef(GetBatchField(Op, 'x2'), 0);
            Y2 := StrToIntDef(GetBatchField(Op, 'y2'), 0);
            Width := StrToIntDef(GetBatchField(Op, 'width'), 1);
            If Width < 0 Then Width := 0;
            If Width > 3 Then Width := 3;

            Line := SchServer.SchObjectFactory(eLine, eCreate_Default);
            If Line = Nil Then
            Begin
                Inc(Failed);
                Continue;
            End;

            { Read-modify-write the TLocation record -- see Lib_AddSymbolLine. }
            Loc := Line.Location;
            Loc.X := MilsToCoord(X1);
            Loc.Y := MilsToCoord(Y1);
            Line.Location := Loc;
            Loc := Line.Corner;
            Loc.X := MilsToCoord(X2);
            Loc.Y := MilsToCoord(Y2);
            Line.Corner := Loc;
            Line.LineWidth := Width;

            SetOwnerPart(Line, Component);
            Component.AddSchObject(Line);
            SchRegisterObject(Component, Line);
            Inc(Added);
        End;
    Finally
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
    End;

    MarkLibDirty(SchLib);

    Result := BuildSuccessResponse(RequestId,
        '{"added":' + IntToStr(Added) + ',"failed":' + IntToStr(Failed)
        + ',"total":' + IntToStr(OpCount) + '}');
End;

{..............................................................................}
{ Lib_AuditStyles - bulk visual-style audit across every component in a       }
{ library. Walks SchLib.SchIterator with eSchComponent filter (live           }
{ components, no per-name GetState_SchComponentByLibRef lookup), and emits    }
{ the designator's full style record per component. Comment / parameter_     }
{ styles / pins are opt-in via flags so the default response stays compact.  }
{                                                                              }
{ Filter mode: when expect_designator_font_id and/or expect_designator_color }
{ are supplied, only components whose designator does NOT match the expected }
{ value go in the output. Without filters, every component is returned.       }
{                                                                              }
{ Params:                                                                     }
{   library_path                  - .SchLib path. Defaults to focused doc.   }
{   with_comment=true             - include comment style record per comp.  }
{   with_parameters=true          - include parameter_styles array per comp.}
{   with_pins=true                - include pins array per comp.             }
{   expect_designator_font_id=N   - filter: trim matches.                    }
{   expect_designator_color=N     - filter: trim matches.                    }
{   limit=5000                    - cap on emitted entries.                  }
{                                                                              }
{ Returns object with library_path, count, mismatch_count, limit, truncated, }
{ filter_applied, components:[...].                                          }
Function Lib_AuditStyles(Params : String; RequestId : String) : String;
Var
    LibPath, FocusedPath, FlagStr : String;
    ExpFontIdStr, ExpColorStr : String;
    HasExpFontId, HasExpColor, FilterApplied : Boolean;
    WithComment, WithParameters, WithPins : Boolean;
    ExpFontId, ExpColor : Integer;
    Workspace : IWorkspace;
    Doc : IDocument;
    SchLib : ISch_Lib;
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    PinIter, ParamIter : ISch_Iterator;
    Component : ISch_Component;
    Pin : ISch_Pin;
    Param : ISch_Parameter;
    DesigLabel : ISch_Label;
    Limit, Count, MismatchCount, PinCount, NumComps, I : Integer;
    DesigFontId, DesigColor : Integer;
    DesigJson, CommentJson, PinList, StyleList, ElecStr, ResultsJson, Entry, CompName : String;
    PinLabelHidden : Boolean;
    First, FirstPin, FirstStyle, Mismatched : Boolean;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);

    FlagStr := ExtractJsonValue(Params, 'with_comment');
    WithComment := (FlagStr = 'true') Or (FlagStr = 'True') Or (FlagStr = '1');
    FlagStr := ExtractJsonValue(Params, 'with_parameters');
    WithParameters := (FlagStr = 'true') Or (FlagStr = 'True') Or (FlagStr = '1');
    FlagStr := ExtractJsonValue(Params, 'with_pins');
    WithPins := (FlagStr = 'true') Or (FlagStr = 'True') Or (FlagStr = '1');

    Limit := StrToIntDef(ExtractJsonValue(Params, 'limit'), 5000);

    ExpFontIdStr := ExtractJsonValue(Params, 'expect_designator_font_id');
    ExpColorStr := ExtractJsonValue(Params, 'expect_designator_color');
    HasExpFontId := ExpFontIdStr <> '';
    HasExpColor := ExpColorStr <> '';
    ExpFontId := StrToIntDef(ExpFontIdStr, 0);
    ExpColor := StrToIntDef(ExpColorStr, 0);
    FilterApplied := HasExpFontId Or HasExpColor;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then
        Try FocusedPath := Doc.DM_FullPath; Except End;

    If LibPath = '' Then LibPath := FocusedPath;
    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library document is active and no library_path was supplied');
        Exit;
    End;

    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
            'Failed to focus library at ' + LibPath);
        Exit;
    End;

    Count := 0;
    MismatchCount := 0;
    ResultsJson := '';
    First := True;

    { Enumerate via ILibCompInfoReader. The schematic SchIterator with        }
    { eSchComponent only walks components placed on a regular SchDoc, NOT    }
    { the symbol entries inside a SchLib. The CompInfoReader gives names    }
    { in document order; for each name we load the live ISch_Component via }
    { GetState_SchComponentByLibRef to read its designator/comment/parameter}
    { style records. This is the same pattern Lib_GetComponents uses.        }
    LibReader := SchServer.CreateLibCompInfoReader(LibPath);
    If LibReader = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'READER_FAILED',
            'Failed to create library reader for ' + LibPath);
        Exit;
    End;

    Try
        LibReader.ReadAllComponentInfo;
        NumComps := LibReader.NumComponentInfos;

        For I := 0 To NumComps - 1 Do
        Begin
            If Count >= Limit Then Break;

            CompInfo := LibReader.ComponentInfos[I];
            CompName := '';
            Try CompName := CompInfo.CompName; Except End;
            If CompName = '' Then Continue;

            Component := SchLib.GetState_SchComponentByLibRef(CompName);
            If Component = Nil Then Continue;

            { Read designator font_id / color via the typed ISch_Label local. }
            { Component.Designator returns ISch_Designator which IS an        }
            { ISch_Label, so the assignment + late-bound property reads       }
            { resolve cleanly at compile time.                                  }
            DesigLabel := Nil;
            DesigFontId := 0;
            DesigColor := 0;
            Try DesigLabel := Component.Designator; Except End;
            If DesigLabel <> Nil Then
            Begin
                Try DesigFontId := DesigLabel.FontId; Except End;
                Try DesigColor := DesigLabel.Color; Except End;
            End;

            Mismatched := False;
            If HasExpFontId And (DesigFontId <> ExpFontId) Then Mismatched := True;
            If HasExpColor And (DesigColor <> ExpColor) Then Mismatched := True;

            { Skip when filter is on and the component matches the expected }
            { style. Without filters, every component is emitted.            }
            If (Not FilterApplied) Or Mismatched Then
            Begin

                DesigJson := '{"text":"","font_id":0,"color":0,"is_hidden":false,"x":0,"y":0,"orientation":0,"justification":0}';
                If DesigLabel <> Nil Then
                    Try DesigJson := BuildLabelStyleJson(DesigLabel, True); Except End;

                Entry := '{"name":"' + EscapeJsonString(CompName) +
                    '","designator":' + DesigJson +
                    ',"mismatched":' + BoolToJsonStr(Mismatched);

                If WithComment Then
                Begin
                    CommentJson := '{"text":"","font_id":0,"color":0,"is_hidden":false,"x":0,"y":0,"orientation":0,"justification":0}';
                    Try CommentJson := BuildLabelStyleJson(Component.Comment, True); Except End;
                    Entry := Entry + ',"comment":' + CommentJson;
                End;

                If WithPins Then
                Begin
                    PinList := '';
                    FirstPin := True;
                    PinCount := 0;
                    PinIter := Component.SchIterator_Create;
                    PinIter.AddFilter_ObjectSet(MkSet(ePin));
                    Try
                        Pin := PinIter.FirstSchObject;
                        While Pin <> Nil Do
                        Begin
                            If Not FirstPin Then PinList := PinList + ',';
                            FirstPin := False;

                            If Pin.Electrical = eElectricInput Then ElecStr := 'input'
                            Else If Pin.Electrical = eElectricOutput Then ElecStr := 'output'
                            Else If Pin.Electrical = eElectricIO Then ElecStr := 'bidirectional'
                            Else If Pin.Electrical = eElectricPassive Then ElecStr := 'passive'
                            Else If Pin.Electrical = eElectricPower Then ElecStr := 'power'
                            Else If Pin.Electrical = eElectricOpenCollector Then ElecStr := 'open_collector'
                            Else If Pin.Electrical = eElectricOpenEmitter Then ElecStr := 'open_emitter'
                            Else If Pin.Electrical = eElectricHiZ Then ElecStr := 'hiz'
                            Else ElecStr := 'passive';

                            PinLabelHidden := False;
                            Try PinLabelHidden := (Not Pin.ShowName) And (Not Pin.ShowDesignator); Except End;

                            PinList := PinList + '{"designator":"' + EscapeJsonString(Pin.Designator) +
                                '","name":"' + EscapeJsonString(Pin.Name) +
                                '","electrical_type":"' + ElecStr +
                                '","x":' + IntToStr(CoordToMils(Pin.Location.X)) +
                                ',"y":' + IntToStr(CoordToMils(Pin.Location.Y)) +
                                ',"orientation":' + IntToStr(Pin.Orientation) +
                                ',"hidden":' + BoolToJsonStr(Pin.IsHidden) +
                                ',"label_hidden":' + BoolToJsonStr(PinLabelHidden) + '}';
                            Inc(PinCount);

                            Pin := PinIter.NextSchObject;
                        End;
                    Finally
                        Component.SchIterator_Destroy(PinIter);
                    End;
                    Entry := Entry + ',"pin_count":' + IntToStr(PinCount) +
                        ',"pins":[' + PinList + ']';
                End;

                If WithParameters Then
                Begin
                    StyleList := '';
                    FirstStyle := True;
                    ParamIter := Component.SchIterator_Create;
                    ParamIter.AddFilter_ObjectSet(MkSet(eParameter));
                    Try
                        Param := ParamIter.FirstSchObject;
                        While Param <> Nil Do
                        Begin
                            If Not FirstStyle Then StyleList := StyleList + ',';
                            FirstStyle := False;
                            StyleList := StyleList + '{"name":"' + EscapeJsonString(Param.Name) +
                                '","value":"' + EscapeJsonString(Param.Text) +
                                '","style":' + BuildLabelStyleJson(Param, False) + '}';
                            Param := ParamIter.NextSchObject;
                        End;
                    Finally
                        Component.SchIterator_Destroy(ParamIter);
                    End;
                    Entry := Entry + ',"parameter_styles":[' + StyleList + ']';
                End;

                Entry := Entry + '}';

                If Not First Then ResultsJson := ResultsJson + ',';
                First := False;
                ResultsJson := ResultsJson + Entry;

                If Mismatched Then Inc(MismatchCount);
                Inc(Count);
            End;
        End;
    Finally
        SchServer.DestroyCompInfoReader(LibReader);
    End;

    Result := BuildSuccessResponse(RequestId,
        '{"library_path":"' + EscapeJsonString(LibPath) + '"' +
        ',"count":' + IntToStr(Count) +
        ',"mismatch_count":' + IntToStr(MismatchCount) +
        ',"limit":' + IntToStr(Limit) +
        ',"truncated":' + BoolToJsonStr(Count >= Limit) +
        ',"filter_applied":' + BoolToJsonStr(FilterApplied) +
        ',"components":[' + ResultsJson + ']}');
End;

{..............................................................................}
{ Lib_SetLabelFormat - bulk OR single-component label-style writer.            }
{                                                                              }
{ Sets any subset of (font_id, color, is_hidden, orientation, justification) }
{ on a target ISch_Label (designator, comment, or one named parameter) for    }
{ either one component (component_name supplied) or every component in the   }
{ library (component_name omitted). Symmetric counterpart to                  }
{ lib_audit_styles' filtering: when only_mismatched is true (default), the   }
{ handler skips components whose target label already matches every          }
{ specified field, so re-runs after partial application stay idempotent.     }
{                                                                              }
{ The whole edit batch is wrapped in ProcessControl.PreProcess /              }
{ PostProcess('Edit') so Altium's undo stack records it as one step. Each    }
{ label modification is bracketed by SchBeginModify / SchEndModify on the    }
{ ISch_Label so the SchServer broadcasts a refresh for that primitive.      }
{ MarkLibDirty fires once at the end; saves are deferred per the project-    }
{ side perf_deferred_save pattern.                                            }
{                                                                              }
{ Params (any combination of style fields, omitted ones are left untouched): }
{   library_path                  - .SchLib path. Defaults to focused doc.   }
{   component_name                - optional, single-component mode.         }
{   target=designator|comment|parameter:<name>  (default 'designator')      }
{   font_id, color, is_hidden, orientation, justification - new style values }
{   only_mismatched=true|false    (default true) - skip already-compliant   }
{   limit=5000                    - cap on processed components in bulk     }
{                                                                              }
{ Returns object: library_path, target, scope, total, modified,              }
{ already_compliant, missing_target, failed, limit, truncated.              }
Procedure ResolveTargetLabel(Component : ISch_Component; Target : String;
    Var Lbl : ISch_Label; Var Found : Boolean);
Var
    Iter : ISch_Iterator;
    Param : ISch_Parameter;
    ParamName : String;
Begin
    Lbl := Nil;
    Found := False;

    If Target = 'designator' Then
    Begin
        Try Lbl := Component.Designator; Found := (Lbl <> Nil); Except End;
    End
    Else If Target = 'comment' Then
    Begin
        Try Lbl := Component.Comment; Found := (Lbl <> Nil); Except End;
    End
    Else If Pos('parameter:', Target) = 1 Then
    Begin
        ParamName := Copy(Target, 11, Length(Target) - 10);
        If ParamName = '' Then Exit;
        Iter := Component.SchIterator_Create;
        Iter.AddFilter_ObjectSet(MkSet(eParameter));
        Try
            Param := Iter.FirstSchObject;
            While Param <> Nil Do
            Begin
                If Param.Name = ParamName Then
                Begin
                    Lbl := Param;
                    Found := True;
                    Break;
                End;
                Param := Iter.NextSchObject;
            End;
        Finally
            Component.SchIterator_Destroy(Iter);
        End;
    End;
End;

Function ApplyLabelFormat(Lbl : ISch_Label;
    HasFontId : Boolean; NewFontId : Integer;
    HasColor : Boolean; NewColor : Integer;
    HasIsHidden : Boolean; NewIsHidden : Boolean;
    HasOrientation : Boolean; NewOrientation : Integer;
    HasJustification : Boolean; NewJustification : Integer;
    OnlyMismatched : Boolean) : Integer;
{ Returns 1 if modified, 0 if compliant (skipped), -1 if the write itself     }
{ raised (counted as failed by the caller).                                   }
Var
    Compliant : Boolean;
Begin
    Result := 0;
    If Lbl = Nil Then Exit;

    If OnlyMismatched Then
    Begin
        Compliant := True;
        If HasFontId Then
            Try If Lbl.FontId <> NewFontId Then Compliant := False; Except End;
        If Compliant And HasColor Then
            Try If Lbl.Color <> NewColor Then Compliant := False; Except End;
        If Compliant And HasIsHidden Then
            Try If Lbl.IsHidden <> NewIsHidden Then Compliant := False; Except End;
        If Compliant And HasOrientation Then
            Try If Lbl.Orientation <> NewOrientation Then Compliant := False; Except End;
        If Compliant And HasJustification Then
            Try If Lbl.Justification <> NewJustification Then Compliant := False; Except End;
        If Compliant Then Exit;
    End;

    Try
        SchBeginModify(Lbl);
        If HasFontId Then Lbl.FontId := NewFontId;
        If HasColor Then Lbl.Color := NewColor;
        If HasIsHidden Then Lbl.IsHidden := NewIsHidden;
        If HasOrientation Then Lbl.Orientation := NewOrientation;
        If HasJustification Then Lbl.Justification := NewJustification;
        SchEndModify(Lbl);
        Result := 1;
    Except
        Result := -1;
    End;
End;

Function Lib_SetLabelFormat(Params : String; RequestId : String) : String;
Var
    LibPath, FocusedPath, Target, CompName, FlagStr : String;
    HasFontId, HasColor, HasIsHidden, HasOrientation, HasJustification : Boolean;
    NewFontId, NewColor, NewOrientation, NewJustification : Integer;
    NewIsHidden, OnlyMismatched, Found : Boolean;
    Workspace : IWorkspace;
    Doc : IDocument;
    SchLib : ISch_Lib;
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    Component : ISch_Component;
    Lbl : ISch_Label;
    Limit, Total, Modified, AlreadyCompliant, MissingTarget, Failed, NumComps, I, ApplyResult : Integer;
    Scope : String;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);
    Target := ExtractJsonValue(Params, 'target');
    If Target = '' Then Target := 'designator';
    CompName := ExtractJsonValue(Params, 'component_name');

    HasFontId := ExtractJsonValue(Params, 'font_id') <> '';
    NewFontId := StrToIntDef(ExtractJsonValue(Params, 'font_id'), 0);
    HasColor := ExtractJsonValue(Params, 'color') <> '';
    NewColor := StrToIntDef(ExtractJsonValue(Params, 'color'), 0);
    HasIsHidden := ExtractJsonValue(Params, 'is_hidden') <> '';
    NewIsHidden := False;
    FlagStr := ExtractJsonValue(Params, 'is_hidden');
    If (FlagStr = 'true') Or (FlagStr = 'True') Or (FlagStr = '1') Then NewIsHidden := True;
    HasOrientation := ExtractJsonValue(Params, 'orientation') <> '';
    NewOrientation := StrToIntDef(ExtractJsonValue(Params, 'orientation'), 0);
    HasJustification := ExtractJsonValue(Params, 'justification') <> '';
    NewJustification := StrToIntDef(ExtractJsonValue(Params, 'justification'), 0);

    FlagStr := ExtractJsonValue(Params, 'only_mismatched');
    OnlyMismatched := (FlagStr <> 'false') And (FlagStr <> 'False') And (FlagStr <> '0');

    Limit := StrToIntDef(ExtractJsonValue(Params, 'limit'), 5000);

    If (Not HasFontId) And (Not HasColor) And (Not HasIsHidden)
        And (Not HasOrientation) And (Not HasJustification) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NOTHING_TO_SET',
            'At least one of font_id / color / is_hidden / orientation / justification must be supplied');
        Exit;
    End;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
    If LibPath = '' Then LibPath := FocusedPath;
    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library document is active and no library_path was supplied');
        Exit;
    End;

    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;

    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
            'Failed to focus library at ' + LibPath);
        Exit;
    End;

    Total := 0;
    Modified := 0;
    AlreadyCompliant := 0;
    MissingTarget := 0;
    Failed := 0;

    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        If CompName <> '' Then
        Begin
            { Single-component mode. }
            Scope := 'single';
            Component := SchLib.GetState_SchComponentByLibRef(CompName);
            If Component = Nil Then
            Begin
                Result := BuildErrorResponse(RequestId, 'COMPONENT_NOT_FOUND',
                    'Component not found in library: ' + CompName);
                Exit;
            End;
            Total := 1;
            ResolveTargetLabel(Component, Target, Lbl, Found);
            If Not Found Then
                Inc(MissingTarget)
            Else
            Begin
                ApplyResult := ApplyLabelFormat(Lbl, HasFontId, NewFontId,
                    HasColor, NewColor, HasIsHidden, NewIsHidden,
                    HasOrientation, NewOrientation, HasJustification, NewJustification,
                    OnlyMismatched);
                If ApplyResult = 1 Then Inc(Modified)
                Else If ApplyResult = 0 Then Inc(AlreadyCompliant)
                Else Inc(Failed);
            End;
        End
        Else
        Begin
            { Bulk mode: walk library via CompInfoReader, same enumeration as }
            { Lib_GetComponents and Lib_AuditStyles.                            }
            Scope := 'bulk';
            LibReader := SchServer.CreateLibCompInfoReader(LibPath);
            If LibReader = Nil Then
            Begin
                Result := BuildErrorResponse(RequestId, 'READER_FAILED',
                    'Failed to create library reader for ' + LibPath);
                Exit;
            End;
            Try
                LibReader.ReadAllComponentInfo;
                NumComps := LibReader.NumComponentInfos;

                For I := 0 To NumComps - 1 Do
                Begin
                    If Total >= Limit Then Break;
                    CompInfo := LibReader.ComponentInfos[I];
                    CompName := '';
                    Try CompName := CompInfo.CompName; Except End;
                    If CompName = '' Then Continue;
                    Component := SchLib.GetState_SchComponentByLibRef(CompName);
                    If Component = Nil Then Continue;
                    Inc(Total);

                    ResolveTargetLabel(Component, Target, Lbl, Found);
                    If Not Found Then
                    Begin
                        Inc(MissingTarget);
                        Continue;
                    End;

                    ApplyResult := ApplyLabelFormat(Lbl, HasFontId, NewFontId,
                        HasColor, NewColor, HasIsHidden, NewIsHidden,
                        HasOrientation, NewOrientation, HasJustification, NewJustification,
                        OnlyMismatched);
                    If ApplyResult = 1 Then Inc(Modified)
                    Else If ApplyResult = 0 Then Inc(AlreadyCompliant)
                    Else Inc(Failed);
                End;
            Finally
                SchServer.DestroyCompInfoReader(LibReader);
            End;
        End;
    Finally
        SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
    End;

    If Modified > 0 Then MarkLibDirty(SchLib);

    Try SchLib.GraphicallyInvalidate; Except End;

    Result := BuildSuccessResponse(RequestId,
        '{"library_path":"' + EscapeJsonString(LibPath) + '"' +
        ',"target":"' + EscapeJsonString(Target) + '"' +
        ',"scope":"' + EscapeJsonString(Scope) + '"' +
        ',"total":' + IntToStr(Total) +
        ',"modified":' + IntToStr(Modified) +
        ',"already_compliant":' + IntToStr(AlreadyCompliant) +
        ',"missing_target":' + IntToStr(MissingTarget) +
        ',"failed":' + IntToStr(Failed) +
        ',"limit":' + IntToStr(Limit) +
        ',"truncated":' + BoolToJsonStr(Total >= Limit) + '}');
End;

{ Lib_SetLabelFormats - apply N (target, style) ops in one library walk.      }
{                                                                              }
{ Same semantics as Lib_SetLabelFormat but processes a list of ops in a       }
{ single IPC round-trip, with one library focus and one walk. Five sequential }
{ set_label_format calls (one per parameter target) collapse into one trip,   }
{ which is the dominant cost on large libraries (each call carries the IPC,  }
{ workspace lookup, doc-focus check and CompInfoReader walk).                  }
{                                                                              }
{ Wire format for `ops` matches the project-wide NextBatchOp grammar: ops    }
{ are separated by ~~ and per-op fields by `;`, key=value. Each op may set    }
{ target, font_id, color, is_hidden, orientation, justification. The global  }
{ only_mismatched flag applies to every op.                                   }
{                                                                              }
{ Returns object: library_path, scope ("single"|"bulk"), total, limit,        }
{ truncated, ops array each with target, modified, already_compliant,         }
{ missing_target, failed.                                                     }

Function ApplyOpToComponent(Component : ISch_Component; Target : String;
    FontIdStr, ColorStr, IsHiddenStr, OrientationStr, JustificationStr : String;
    OnlyMismatched : Boolean) : Integer;
{ Returns 0=already_compliant, 1=modified, 2=missing_target, 3=failed.        }
Var
    HasFontId, HasColor, HasIsHidden, HasOrientation, HasJustification : Boolean;
    NewFontId, NewColor, NewOrientation, NewJustification : Integer;
    NewIsHidden, Found : Boolean;
    Lbl : ISch_Label;
    AR : Integer;
Begin
    HasFontId := FontIdStr <> '';
    NewFontId := StrToIntDef(FontIdStr, 0);
    HasColor := ColorStr <> '';
    NewColor := StrToIntDef(ColorStr, 0);
    HasIsHidden := IsHiddenStr <> '';
    NewIsHidden := (IsHiddenStr = 'true') Or (IsHiddenStr = 'True') Or (IsHiddenStr = '1');
    HasOrientation := OrientationStr <> '';
    NewOrientation := StrToIntDef(OrientationStr, 0);
    HasJustification := JustificationStr <> '';
    NewJustification := StrToIntDef(JustificationStr, 0);

    ResolveTargetLabel(Component, Target, Lbl, Found);
    If Not Found Then
    Begin
        Result := 2;
        Exit;
    End;
    AR := ApplyLabelFormat(Lbl, HasFontId, NewFontId,
        HasColor, NewColor, HasIsHidden, NewIsHidden,
        HasOrientation, NewOrientation, HasJustification, NewJustification,
        OnlyMismatched);
    If AR = 1 Then Result := 1
    Else If AR = 0 Then Result := 0
    Else Result := 3;
End;

Function Lib_SetLabelFormats(Params : String; RequestId : String) : String;
Var
    LibPath, FocusedPath, CompName, FlagStr : String;
    OpsStr, OpStr, Remaining, CurCompName, Target : String;
    OnlyMismatched : Boolean;
    Workspace : IWorkspace;
    Doc : IDocument;
    SchLib : ISch_Lib;
    LibReader : ILibCompInfoReader;
    CompInfo : IComponentInfo;
    Component : ISch_Component;
    Limit, Total, NumComps, I, J, NumOps, OpResult : Integer;
    Scope, OpsJson, RespJson : String;
    AnyModified : Boolean;
    { Parallel TStringLists -- DelphiScript Function locals with fixed-size  }
    { arrays silently corrupt Result, so we use TStringList per the project's }
    { existing pattern. Counter fields hold IntToStr(N).                       }
    OpTargets, OpFontIds, OpColors, OpIsHidden,
        OpOrientation, OpJustification : TStringList;
    OpModified, OpAlready, OpMissing, OpFailed : TStringList;
Begin
    LibPath := ExtractJsonValue(Params, 'library_path');
    LibPath := StringReplace(LibPath, '\\', '\', -1);
    CompName := ExtractJsonValue(Params, 'component_name');
    OpsStr := ExtractJsonValue(Params, 'ops');
    If OpsStr = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAM',
            'ops is required (non-empty ~~-separated list)');
        Exit;
    End;
    FlagStr := ExtractJsonValue(Params, 'only_mismatched');
    OnlyMismatched := (FlagStr <> 'false') And (FlagStr <> 'False') And (FlagStr <> '0');
    Limit := StrToIntDef(ExtractJsonValue(Params, 'limit'), 5000);

    { Workspace + library focus checks BEFORE allocating TStringLists so an  }
    { early-exit error path does not leak.                                    }
    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;
    FocusedPath := '';
    Doc := Workspace.DM_FocusedDocument;
    If Doc <> Nil Then Try FocusedPath := Doc.DM_FullPath; Except End;
    If LibPath = '' Then LibPath := FocusedPath;
    If LibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_LIBRARY',
            'No library document is active and no library_path was supplied');
        Exit;
    End;
    If (FocusedPath = '') Or (UpperCase(FocusedPath) <> UpperCase(LibPath)) Then
    Begin
        ResetParameters;
        AddStringParameter('ObjectKind', 'Document');
        AddStringParameter('FileName', LibPath);
        RunProcess('WorkspaceManager:OpenObject');
    End;
    SchLib := SchServer.GetCurrentSchDocument;
    If (SchLib = Nil) Or (SchLib.ObjectId <> eSchLib) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB',
            'Failed to focus library at ' + LibPath);
        Exit;
    End;

    OpTargets := TStringList.Create;
    OpFontIds := TStringList.Create;
    OpColors := TStringList.Create;
    OpIsHidden := TStringList.Create;
    OpOrientation := TStringList.Create;
    OpJustification := TStringList.Create;
    OpModified := TStringList.Create;
    OpAlready := TStringList.Create;
    OpMissing := TStringList.Create;
    OpFailed := TStringList.Create;
    Try
        NumOps := 0;
        Remaining := OpsStr;
        While True Do
        Begin
            OpStr := NextBatchOp(Remaining);
            If OpStr = '' Then Break;
            Target := GetBatchField(OpStr, 'target');
            If Target = '' Then Target := 'designator';
            OpTargets.Add(Target);
            OpFontIds.Add(GetBatchField(OpStr, 'font_id'));
            OpColors.Add(GetBatchField(OpStr, 'color'));
            OpIsHidden.Add(GetBatchField(OpStr, 'is_hidden'));
            OpOrientation.Add(GetBatchField(OpStr, 'orientation'));
            OpJustification.Add(GetBatchField(OpStr, 'justification'));
            OpModified.Add('0');
            OpAlready.Add('0');
            OpMissing.Add('0');
            OpFailed.Add('0');
            Inc(NumOps);
        End;

        If NumOps = 0 Then
        Begin
            Result := BuildErrorResponse(RequestId, 'NOTHING_TO_SET',
                'ops parsed to zero entries');
            Exit;
        End;

        Total := 0;
        SchServer.ProcessControl.PreProcess(SchLib, '');
        Try
            If CompName <> '' Then
            Begin
                Scope := 'single';
                Component := SchLib.GetState_SchComponentByLibRef(CompName);
                If Component = Nil Then
                Begin
                    Result := BuildErrorResponse(RequestId, 'COMPONENT_NOT_FOUND',
                        'Component not found in library: ' + CompName);
                    Exit;
                End;
                Total := 1;
                For J := 0 To NumOps - 1 Do
                Begin
                    OpResult := ApplyOpToComponent(Component, OpTargets[J],
                        OpFontIds[J], OpColors[J], OpIsHidden[J],
                        OpOrientation[J], OpJustification[J], OnlyMismatched);
                    If OpResult = 0 Then
                        OpAlready[J] := IntToStr(StrToIntDef(OpAlready[J], 0) + 1)
                    Else If OpResult = 1 Then
                        OpModified[J] := IntToStr(StrToIntDef(OpModified[J], 0) + 1)
                    Else If OpResult = 2 Then
                        OpMissing[J] := IntToStr(StrToIntDef(OpMissing[J], 0) + 1)
                    Else
                        OpFailed[J] := IntToStr(StrToIntDef(OpFailed[J], 0) + 1);
                End;
            End
            Else
            Begin
                Scope := 'bulk';
                LibReader := SchServer.CreateLibCompInfoReader(LibPath);
                If LibReader = Nil Then
                Begin
                    Result := BuildErrorResponse(RequestId, 'READER_FAILED',
                        'Failed to create library reader for ' + LibPath);
                    Exit;
                End;
                Try
                    LibReader.ReadAllComponentInfo;
                    NumComps := LibReader.NumComponentInfos;
                    For I := 0 To NumComps - 1 Do
                    Begin
                        If Total >= Limit Then Break;
                        CompInfo := LibReader.ComponentInfos[I];
                        CurCompName := '';
                        Try CurCompName := CompInfo.CompName; Except End;
                        If CurCompName = '' Then Continue;
                        Component := SchLib.GetState_SchComponentByLibRef(CurCompName);
                        If Component = Nil Then Continue;
                        Inc(Total);

                        For J := 0 To NumOps - 1 Do
                        Begin
                            OpResult := ApplyOpToComponent(Component, OpTargets[J],
                                OpFontIds[J], OpColors[J], OpIsHidden[J],
                                OpOrientation[J], OpJustification[J], OnlyMismatched);
                            If OpResult = 0 Then
                                OpAlready[J] := IntToStr(StrToIntDef(OpAlready[J], 0) + 1)
                            Else If OpResult = 1 Then
                                OpModified[J] := IntToStr(StrToIntDef(OpModified[J], 0) + 1)
                            Else If OpResult = 2 Then
                                OpMissing[J] := IntToStr(StrToIntDef(OpMissing[J], 0) + 1)
                            Else
                                OpFailed[J] := IntToStr(StrToIntDef(OpFailed[J], 0) + 1);
                        End;
                    End;
                Finally
                    SchServer.DestroyCompInfoReader(LibReader);
                End;
            End;
        Finally
            SchServer.ProcessControl.PostProcess(SchLib, 'Edit');
        End;

        AnyModified := False;
        For J := 0 To NumOps - 1 Do
            If StrToIntDef(OpModified[J], 0) > 0 Then AnyModified := True;
        If AnyModified Then MarkLibDirty(SchLib);
        Try SchLib.GraphicallyInvalidate; Except End;

        OpsJson := '[';
        For J := 0 To NumOps - 1 Do
        Begin
            If J > 0 Then OpsJson := OpsJson + ',';
            OpsJson := OpsJson +
                '{"target":"' + EscapeJsonString(OpTargets[J]) + '"' +
                ',"modified":' + OpModified[J] +
                ',"already_compliant":' + OpAlready[J] +
                ',"missing_target":' + OpMissing[J] +
                ',"failed":' + OpFailed[J] + '}';
        End;
        OpsJson := OpsJson + ']';

        { Stash the full JSON in a local before assigning to Result -- the    }
        { DelphiScript last-arg clobber bug only bites on String returns      }
        { with a String arg, but the pattern is cheap insurance.              }
        RespJson :=
            '{"library_path":"' + EscapeJsonString(LibPath) + '"' +
            ',"scope":"' + EscapeJsonString(Scope) + '"' +
            ',"total":' + IntToStr(Total) +
            ',"limit":' + IntToStr(Limit) +
            ',"truncated":' + BoolToJsonStr(Total >= Limit) +
            ',"ops":' + OpsJson + '}';
        Result := BuildSuccessResponse(RequestId, RespJson);
    Finally
        OpTargets.Free;
        OpFontIds.Free;
        OpColors.Free;
        OpIsHidden.Free;
        OpOrientation.Free;
        OpJustification.Free;
        OpModified.Free;
        OpAlready.Free;
        OpMissing.Free;
        OpFailed.Free;
    End;
End;

{ Lib_ExtractIntLib - Extract .SchLib and .PcbLib sources from an .IntLib.   }
{                                                                              }
{ An Altium .IntLib (integrated library) packages compiled symbol and        }
{ footprint libraries together; the editor's "Extract Sources" command       }
{ writes the underlying .SchLib + .PcbLib back to disk so they can be        }
{ inspected or modified. This handler opens the .IntLib, runs the extract   }
{ process, and then probes the conventional output locations (Altium drops  }
{ them into a sibling folder named after the IntLib base name) to report    }
{ which files were produced.                                                  }
{                                                                              }
{ Params:                                                                      }
{   intlib_path (required) - path to the .IntLib file                       }
{                                                                              }
{ Returns: process_run, sch_lib_path/sch_lib_found, pcb_lib_path/found.     }
Function Lib_ExtractIntLib(Params : String; RequestId : String) : String;
Var
    IntLibPath, BaseName, ParentDir, ExtractDir : String;
    SchLibPath, PcbLibPath : String;
    FoundSch, FoundPcb : Boolean;
    Workspace : IWorkspace;
    RespJson : String;
Begin
    IntLibPath := ExtractJsonValue(Params, 'intlib_path');
    IntLibPath := StringReplace(IntLibPath, '\\', '\', -1);
    If IntLibPath = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAMS',
            'intlib_path is required');
        Exit;
    End;
    If Not FileExists(IntLibPath) Then
    Begin
        Result := BuildErrorResponse(RequestId, 'FILE_NOT_FOUND',
            'IntLib not found: ' + IntLibPath);
        Exit;
    End;

    Workspace := GetWorkspace;
    If Workspace = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_WORKSPACE', 'No workspace');
        Exit;
    End;

    { Open the IntLib in Altium's integrated-library editor so the      }
    { extract command has a current document to act on.                  }
    ResetParameters;
    AddStringParameter('ObjectKind', 'Document');
    AddStringParameter('FileName', IntLibPath);
    RunProcess('WorkspaceManager:OpenObject');

    { Run Altium's source-extraction. Try/Except won't catch a bad       }
    { process name (DelphiScript can't), so we detect outcome by         }
    { probing for the resulting files instead.                            }
    ResetParameters;
    AddStringParameter('FileName', IntLibPath);
    RunProcess('IntegratedLibrary:ExtractSources');

    { Where Altium writes the extracted files: a sibling folder named    }
    { after the IntLib base name, containing <Base>.SchLib + .PcbLib.    }
    BaseName := ChangeFileExt(ExtractFileName(IntLibPath), '');
    ParentDir := ExtractFilePath(IntLibPath);
    ExtractDir := ParentDir + BaseName + '\';
    SchLibPath := ExtractDir + BaseName + '.SchLib';
    PcbLibPath := ExtractDir + BaseName + '.PcbLib';
    FoundSch := FileExists(SchLibPath);
    FoundPcb := FileExists(PcbLibPath);

    { Fallback locations: same directory as the IntLib (some Altium       }
    { versions drop sources beside the IntLib instead of in a sub-dir).  }
    If Not FoundSch Then
    Begin
        SchLibPath := ParentDir + BaseName + '.SchLib';
        FoundSch := FileExists(SchLibPath);
    End;
    If Not FoundPcb Then
    Begin
        PcbLibPath := ParentDir + BaseName + '.PcbLib';
        FoundPcb := FileExists(PcbLibPath);
    End;

    RespJson :=
        '{"intlib_path":"' + EscapeJsonString(IntLibPath) + '"' +
        ',"extract_dir":"' + EscapeJsonString(ExtractDir) + '"' +
        ',"sch_lib_path":"' + EscapeJsonString(SchLibPath) + '"' +
        ',"sch_lib_found":' + BoolToJsonStr(FoundSch) +
        ',"pcb_lib_path":"' + EscapeJsonString(PcbLibPath) + '"' +
        ',"pcb_lib_found":' + BoolToJsonStr(FoundPcb) + '}';
    Result := BuildSuccessResponse(RequestId, RespJson);
End;

{ Lib_UpdateFootprintHeightsFrom3D                                            }
{                                                                              }
{ Walk every footprint in the active PCB Library and propagate the maximum   }
{ 3D-body OverallHeight up to the footprint's Height field. Footprint.Height }
{ drives the placement-collision DRC rule that prevents tall components       }
{ from getting placed under shorter ones or under an enclosure overhang --   }
{ but libraries shipped without explicit heights default to 0, which         }
{ effectively disables that check.                                            }
{                                                                              }
{ Updates only when the 3D model is TALLER than the current Footprint.Height }
{ -- this matches the common convention and protects against a               }
{ manually-set "I know this part is 5mm despite the model being 3mm" value.  }
Function Lib_UpdateFootprintHeightsFrom3D(Params : String; RequestId : String) : String;
Var
    CurLib : IPCB_Library;
    LibIter : IPCB_LibraryIterator;
    Footprint, SavedCurrent : IPCB_LibComponent;
    GrIter : IPCB_GroupIterator;
    Body : IPCB_ComponentBody;
    Updated, Inspected : Integer;
    Items, FpName : String;
    First : Boolean;
    OldH, NewH : TCoord;
Begin
    CurLib := PCBServer.GetCurrentPCBLibrary;
    If CurLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_PCBLIB',
            'No PCB Library document focused');
        Exit;
    End;

    SavedCurrent := CurLib.CurrentComponent;
    Updated := 0;
    Inspected := 0;
    Items := '';
    First := True;

    LibIter := CurLib.LibraryIterator_Create;
    Try
        LibIter.SetState_FilterAll;
        Footprint := LibIter.FirstPCBObject;
        While Footprint <> Nil Do
        Begin
            Try
                Inc(Inspected);
                NewH := 0;
                GrIter := Footprint.GroupIterator_Create;
                Try
                    GrIter.AddFilter_ObjectSet(MkSet(eComponentBodyObject));
                    Body := GrIter.FirstPCBObject;
                    While Body <> Nil Do
                    Begin
                        Try
                            If Body.OverallHeight > NewH Then NewH := Body.OverallHeight;
                        Except End;
                        Body := GrIter.NextPCBObject;
                    End;
                Finally
                    Footprint.GroupIterator_Destroy(GrIter);
                End;

                OldH := Footprint.Height;
                If (NewH > 0) And (NewH > OldH) Then
                Begin
                    Footprint.Height := NewH;
                    Inc(Updated);
                    FpName := '';
                    Try FpName := Footprint.Name; Except End;
                    If Not First Then Items := Items + ',';
                    First := False;
                    Items := Items + JsonObj(
                        JsonStr('name', FpName) + ',' +
                        JsonFloat('old_height_mm', CoordToMM(OldH)) + ',' +
                        JsonFloat('new_height_mm', CoordToMM(NewH))
                    );
                End;
            Except End;
            Footprint := LibIter.NextPCBObject;
        End;
    Finally
        CurLib.LibraryIterator_Destroy(LibIter);
    End;

    { Restore the originally-focused footprint and mark the lib dirty. }
    If SavedCurrent <> Nil Then CurLib.CurrentComponent := SavedCurrent;
    If Updated > 0 Then
    Begin
        Try
            CurLib.Board.ViewManager_FullUpdate;
            { No SaveDoc here -- libraries should be reviewed by hand    }
            { before saving since this rewrites height data project-wide.}
        Except End;
    End;

    Result := BuildSuccessResponse(RequestId,
        JsonObj(
            JsonInt('inspected', Inspected) + ',' +
            JsonInt('updated', Updated) + ',' +
            JsonRaw('items', '[' + Items + ']')
        ));
End;


{..............................................................................}
{ Lib_SplitPinFunctions - parse each pin's slash-delimited name into its       }
{ function list (the alt-function popup). A pin named "PA0/TX/CTS" becomes     }
{ name "PA0" with functions TX, CTS. Operates on the current library symbol.   }
{..............................................................................}
Function Lib_SplitPinFunctions(Params : String; RequestId : String) : String;
Var
    SchLib : ISch_Lib;
    Component : ISch_Component;
    Iter : ISch_Iterator;
    Pin : ISch_Pin;
    Processed : Integer;
Begin
    SchLib := SchServer.GetCurrentSchDocument;
    If SchLib = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_SCHLIB', 'No schematic library is active');
        Exit;
    End;
    Component := GetTargetLibComponent(SchLib);
    If Component = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_COMPONENT', 'No current library component');
        Exit;
    End;

    Processed := 0;
    SchServer.ProcessControl.PreProcess(SchLib, '');
    Try
        Iter := Component.SchIterator_Create;
        Try
            Iter.AddFilter_ObjectSet(MkSet(ePin));
            Pin := Iter.FirstSchObject;
            While Pin <> Nil Do
            Begin
                Try
                    Pin.SetState_FunctionsFromName;
                    Processed := Processed + 1;
                Except End;
                Pin := Iter.NextSchObject;
            End;
        Finally
            Component.SchIterator_Destroy(Iter);
        End;
    Finally
        SchServer.ProcessControl.PostProcess(SchLib, '');
    End;

    Result := BuildSuccessResponse(RequestId,
        '{"pins_processed":' + IntToStr(Processed) + '}');
End;

{..............................................................................}
{ Lib_InstallLibrary / Lib_UninstallLibrary - register or unregister a library }
{ (.IntLib / .SchLib / .PcbLib) with the environment's Available Libraries.    }
{..............................................................................}
Function Lib_InstallLibrary(Params : String; RequestId : String) : String;
Var
    Path : String;
    Ok : Boolean;
Begin
    Path := StringReplace(ExtractJsonValue(Params, 'library_path'), '\\', '\', -1);
    If Path = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAM', 'library_path is required');
        Exit;
    End;
    If IntegratedLibraryManager = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_MANAGER', 'IntegratedLibraryManager unavailable');
        Exit;
    End;
    Ok := False;
    Try
        IntegratedLibraryManager.InstallLibrary(Path);
        Ok := True;
    Except End;
    Result := BuildSuccessResponse(RequestId,
        '{"installed":' + BoolToJsonStr(Ok) + ',"library_path":"'
        + EscapeJsonString(Path) + '"}');
End;

Function Lib_UninstallLibrary(Params : String; RequestId : String) : String;
Var
    Path : String;
    Ok : Boolean;
Begin
    Path := StringReplace(ExtractJsonValue(Params, 'library_path'), '\\', '\', -1);
    If Path = '' Then
    Begin
        Result := BuildErrorResponse(RequestId, 'MISSING_PARAM', 'library_path is required');
        Exit;
    End;
    If IntegratedLibraryManager = Nil Then
    Begin
        Result := BuildErrorResponse(RequestId, 'NO_MANAGER', 'IntegratedLibraryManager unavailable');
        Exit;
    End;
    Ok := False;
    Try
        IntegratedLibraryManager.UnInstallLibrary(Path);
        Ok := True;
    Except End;
    Result := BuildSuccessResponse(RequestId,
        '{"uninstalled":' + BoolToJsonStr(Ok) + ',"library_path":"'
        + EscapeJsonString(Path) + '"}');
End;

{..............................................................................}
{ Command Handler - must be at end                                             }
{..............................................................................}

Function HandleLibraryCommand(Action : String; Params : String; RequestId : String) : String;
Begin
    Case Action Of
        'create_symbol':        Result := Lib_CreateSymbol(Params, RequestId);
        'add_pin':              Result := Lib_AddPin(Params, RequestId);
        'add_pins':             Result := Lib_AddPins(Params, RequestId);
        'add_symbol_rectangle': Result := Lib_AddSymbolRectangle(Params, RequestId);
        'add_symbol_line':      Result := Lib_AddSymbolLine(Params, RequestId);
        'add_symbol_lines':     Result := Lib_AddSymbolLines(Params, RequestId);
        'create_footprint':     Result := Lib_CreateFootprint(Params, RequestId);
        'add_footprint_pad':    Result := Lib_AddFootprintPad(Params, RequestId);
        'add_footprint_track':  Result := Lib_AddFootprintTrack(Params, RequestId);
        'add_footprint_arc':    Result := Lib_AddFootprintArc(Params, RequestId);
        'add_footprint_text':   Result := Lib_AddFootprintText(Params, RequestId);
        'get_footprints':       Result := Lib_GetFootprints(Params, RequestId);
        'get_footprint_pads':   Result := Lib_GetFootprintPads(Params, RequestId);
        'extract_intlib':       Result := Lib_ExtractIntLib(Params, RequestId);
        'link_footprint':       Result := Lib_LinkFootprint(Params, RequestId);
        'link_3d_model':        Result := Lib_Link3DModel(Params, RequestId);
        'get_components':       Result := Lib_GetComponents(Params, RequestId);
        'search':               Result := Lib_Search(Params, RequestId);
        'get_component_details': Result := Lib_GetComponentDetails(Params, RequestId);
        'batch_set_params':    Result := Lib_BatchSetParams(Params, RequestId);
        'batch_rename':        Result := Lib_BatchRename(Params, RequestId);
        'diff_libraries':     Result := Lib_DiffLibraries(Params, RequestId);
        'add_symbol_arc':     Result := Lib_AddSymbolArc(Params, RequestId);
        'add_symbol_polygon': Result := Lib_AddSymbolPolygon(Params, RequestId);
        'set_component_description': Result := Lib_SetComponentDescription(Params, RequestId);
        'get_pin_list':       Result := Lib_GetPinList(Params, RequestId);
        'copy_component':     Result := Lib_CopyComponent(Params, RequestId);
        'audit_styles':       Result := Lib_AuditStyles(Params, RequestId);
        'set_label_format':   Result := Lib_SetLabelFormat(Params, RequestId);
        'set_label_formats':  Result := Lib_SetLabelFormats(Params, RequestId);
        'set_current_component': Result := Lib_SetCurrentComponent(Params, RequestId);
        'update_footprint_heights_from_3d': Result := Lib_UpdateFootprintHeightsFrom3D(Params, RequestId);
        'split_pin_functions':  Result := Lib_SplitPinFunctions(Params, RequestId);
        'install_library':      Result := Lib_InstallLibrary(Params, RequestId);
        'uninstall_library':    Result := Lib_UninstallLibrary(Params, RequestId);
    Else
        Result := BuildErrorResponse(RequestId, 'UNKNOWN_ACTION', 'Unknown library action: ' + Action);
    End;
End;
