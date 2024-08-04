export const BLOCKS_BLOCK_SIZE = 0.1;
export const BLOCKS_BLOCK_LIBRARY = {
  '2D4Blocks' : "EEE,EEU,EED,EUE,EDE,EUDE,EUW",
  '3D4Blocks' : "EEE,EEN,ENE,ENSE,ENW,ENSU,ENU",
  '2D5Blocks': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDD,EEDW,EEUW,EEWDD,EDED,EDEWD,WDWED,EUDDUE,DEEU,DEED,UEEU",
  '3D5Blocks': "EEEE,EEES,EESE,EESS,EESW,EEWSS,ESES,ESEWS,EUDDUE,SEEN,SEES,EESU,EESD,EEWSD,ESEU,ESED,ESEWU,ESEWD",
  '2D5BlocksEasy': "EEEE,EEEU,EEED,EEUE,EEDE,EEUDE,EEDUE,EEDW,EEUW,DEEU",
  '3D1BlockMulticolor' : ",,,,,,",
  '3D1Block1color' : "",
  '3D3BlockMulticolor' : "EE,EE,EE,EE,EE,EE,EE"
}
export const BLOCKS_KEYS_LIBRARY = {
  '2D': `KeyZ=xminus,KeyX=xplus,Enter=zRotMinus,ShiftRight=zRotPlus,Space=$drop,
         #rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
         #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
         #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`,
  '3D': `KeyG=xminus,KeyJ=xplus,KeyY=zminus,KeyH=zplus,
         Numpad8=xRotMinus,Numpad5=xRotPlus,Numpad4=yRotPlus,Numpad6=yRotMinus,
         Numpad7=zRotMinus,Numpad9=zRotPlus,
         Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
         #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
         #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`,
  'DropOnly': `Space=$drop,#rhand.abuttondown=$drop,#rhand.abuttonup=%drop,
               #rhand.triggerdown=$drop,#rhand.triggerup=%drop,
               #lhand.xbuttondown=$drop,#lhand.xbuttonup=%drop`
}

export const BLOCKS_BLOCK_COLORS = [
  "yellow",
  "blue",
  "white",
  "magenta",
  "cyan",
  "green",
  "red",
  "#888888",
  "#FF8800",
  "#FF0088",
  "#88FF00",
  "#00FF88",
  "#8800FF",
  "#0088FF",
  "#FF8888",
  "#88FF88",
  "#8888FF",
  "#88FFFF",
  "#FFFF88",
  "#FF88FF"
]

export const BLOCKS_CONTROLS_DESKTOP = {
  '2D': `Enter to start\n\nMove L/R: Z & X\n\nRotate: R-Shift/Enter\n\nSpace to drop`,
  '3D': `Enter to start\n\nMove in the horizontal plane: YGHJ\n\nRotations:\nYaw: 4/6\nPitch: 5/8\nRoll:7/9\n\nSpace to drop`
}

export const BLOCKS_CONTROLS_VR = {
  '2D': `B or Right Trigger to start\n\nMove: Left Thumbstick\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA, X or Right Trigger to drop`,
  '3D': `B or Right Trigger to start\n\nMove: Left Thumbstick\n\nRotate: Right Thumbstick or\nRight Grip & turn\n\nA, X or Right Trigger to drop`
}
