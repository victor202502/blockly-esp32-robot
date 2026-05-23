// ============================================================
// BLOCK DEFINITIONS
// ============================================================
Blockly.defineBlocksWithJsonArray([
  // MOTORS
  { "type": "sp_motor_run", "message0": "⚙ Motor %1 run %2 speed %3 (1-10)", "args0": [ {"type":"field_dropdown","name":"MOTOR","options":[["A","A"],["B","B"],["C","C"],["D","D"]]}, {"type":"field_dropdown","name":"DIR","options":[["→ forward","forward"],["← backward","backward"]]}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#E64A19" },
  { "type": "sp_motor_run_rotations", "message0": "⚙ Motor %1 run %2 %3 rotations speed %4 (1-10)", "args0": [ {"type":"field_dropdown","name":"MOTOR","options":[["A","A"],["B","B"],["C","C"],["D","D"]]}, {"type":"field_dropdown","name":"DIR","options":[["→ forward","forward"],["← backward","backward"]]}, {"type":"input_value","name":"ROTATIONS","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#E64A19" },
  { "type": "sp_motor_run_seconds", "message0": "⚙ Motor %1 run %2 for %3 sec speed %4 (1-10)", "args0": [ {"type":"field_dropdown","name":"MOTOR","options":[["A","A"],["B","B"],["C","C"],["D","D"]]}, {"type":"field_dropdown","name":"DIR","options":[["→ forward","forward"],["← backward","backward"]]}, {"type":"input_value","name":"SECONDS","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#E64A19" },
  { "type": "sp_motor_stop", "message0": "⚙ Motor %1 stop", "args0": [{"type":"field_dropdown","name":"MOTOR","options":[["A","A"],["B","B"],["C","C"],["D","D"],["all","all"]]}], "previousStatement":null,"nextStatement":null, "colour":"#E64A19" },
  { "type": "sp_motor_set_speed", "message0": "⚙ Motor %1 set speed %2 (1-10)", "args0": [ {"type":"field_dropdown","name":"MOTOR","options":[["A","A"],["B","B"],["C","C"],["D","D"]]}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#E64A19" },
  // MOVEMENT
  { "type": "sp_move_forward", "message0": "🤖 move forward %1 rotations speed %2 (1-10)", "args0": [ {"type":"input_value","name":"ROTATIONS","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  { "type": "sp_move_backward", "message0": "🤖 move backward %1 rotations speed %2 (1-10)", "args0": [ {"type":"input_value","name":"ROTATIONS","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  { "type": "sp_move_turn_left", "message0": "🤖 turn left %1 ° speed %2 (1-10)", "args0": [ {"type":"input_value","name":"DEGREES","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  { "type": "sp_move_turn_right", "message0": "🤖 turn right %1 ° speed %2 (1-10)", "args0": [ {"type":"input_value","name":"DEGREES","check":"Number"}, {"type":"input_value","name":"SPEED","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  { "type": "sp_move_tank", "message0": "🤖 tank left %1 % right %2 %", "args0": [ {"type":"input_value","name":"LEFT","check":"Number"}, {"type":"input_value","name":"RIGHT","check":"Number"} ], "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  { "type": "sp_move_stop", "message0": "🤖 stop movement", "previousStatement":null,"nextStatement":null, "colour":"#D81B60" },
  // EVENTS (Hat Block)
  { "type": "sp_event_program_start", "message0": "▶ when program starts", "nextStatement":null, "colour":"#F57F17", "hat":"cap" },
  // CONTROL
  { "type": "sp_ctrl_wait", "message0": "⏱ wait %1 seconds", "args0": [{"type":"input_value","name":"SECS","check":"Number"}], "previousStatement":null,"nextStatement":null, "colour":"#F9A825" },
  { "type": "sp_ctrl_repeat", "message0": "🔁 repeat %1 times", "args0": [{"type":"input_value","name":"TIMES","check":"Number"}], "message1": "%1", "args1": [{"type":"input_statement","name":"DO"}], "previousStatement":null,"nextStatement":null, "colour":"#F9A825" },
  { "type": "sp_ctrl_forever", "message0": "🔄 forever", "message1": "%1", "args1": [{"type":"input_statement","name":"DO"}], "previousStatement":null, "colour":"#F9A825" },
  { "type": "sp_ctrl_if", "message0": "❓ if %1 then", "args0": [{"type":"input_value","name":"COND","check":"Boolean"}], "message1": "%1", "args1": [{"type":"input_statement","name":"DO"}], "previousStatement":null,"nextStatement":null, "colour":"#F9A825" },
  { "type": "sp_ctrl_if_else", "message0": "❓ if %1 then", "args0": [{"type":"input_value","name":"COND","check":"Boolean"}], "message1": "%1", "args1": [{"type":"input_statement","name":"DO"}], "message2": "else", "message3": "%1", "args3": [{"type":"input_statement","name":"ELSE"}], "previousStatement":null,"nextStatement":null, "colour":"#F9A825" },
  { "type": "sp_ctrl_stop_all", "message0": "🛑 stop all", "previousStatement":null, "colour":"#F9A825" },
  // OPERATORS
  { "type": "sp_op_random", "message0": "🎲 random %1 to %2", "args0": [ {"type":"input_value","name":"FROM","check":"Number"}, {"type":"input_value","name":"TO","check":"Number"} ], "output":"Number", "colour":"#43A047" }
]);