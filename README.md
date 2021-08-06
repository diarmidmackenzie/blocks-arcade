# blocks-arcade
An immersive VR Arcade filled with a range of Falling Blocks Games in 2D & 3D

## Where to Play

You can play this game at:
https://blocksarcade.xyz

We are also listed on SideQuest...
https://sidequestvr.com/app/3394/blocks-arcade

...and at XR Showcase...

https://xrshowcase.xyz/



## How to Play

You can play the game on most VR systems, or on a desktop, using keyboard.

Desktop/keyboard works fine for 2D games, but it's pretty hard to play 3D games in that setup, since you really need the ability to look at the play area from different angles, which it's only easy to do in VR.

This is not intended for use on Mobile devices, and there are no touchscreen controls.  Sorry!

#### VR controls

Move around the arena using left trigger to teleport (or if you have a big enough room-space play area, just walk!)

There's a tutorial in the center of the arcade, which will teach you the game & controls, but in summary...

- Start a game using B or right trigger
- Move blocks around using the left thumbstick.

- Rotate blocks using the right thumbstick, or by using right grip and rotating the controller in the way you want the block to rotate.
- A, X or Right Trigger to drop a block quickly.

Which game you control gets determined by the direction you are looking + the distance to the game.  The game that is currently under your control will light up around the base & top.

#### Keyboard controls

You can move around the space using WASD, or cursor keys, and mouse to move the camera view.

However it's much easier to get into a good playing position by using the number keys (the ones on the top of the keyboard, not the number pad).

- 1 for the tutorial
- 2-8 for the games
- 9 for the high scores table
- 0 to return to the start position.

If you move your view around while you are playing using WASD/mouse, you can always snap back to a good default playing position using these keys.

For in-game controls, there's a tutorial in the center of the arcade (press 1), which explains it all, but in summary:

- Enter to start a game
- Z/X to move blocks L/R on 2D games
- YGHJ (like WASD) to move blocks on 3D games
- Enter & R-shift to rotate clockwise or counter-clockwise on 2D games
- Number pad 4/6, 7/9 & 8/5 to rotate around 3 different axes in 3D games - I recommend you try this out in the tutorial to get used to how it works.

The keyboard controls are fixed in space, so even if you walk behind the machine, the orientation of the controls remains fixed to your original position.  Maybe it would be better if they auto-adjusted, but I think there's a risk of confusion either way.  I'm not expecting keyboard players to change their point of view much anyway, so I don't think this is such a big deal, but please [give feedback](https://github.com/diarmidmackenzie/blocks-arcade/issues/16) if you disagree!



## URL Parameters

Some configuration is controlled by URL parameters rather than in-game config.  Reasons for this are:

- Quick and simple, without having to worry about coding in-game options screens
- By bookmarking a specific URL, users can save their preferences, without the game having to have a back-end, or use local storage.

Parameters right now are very limited, but may be extended over time

#### Start Parameter

This allows players to start instantly at the position of their choice. See Keyboard controls for more information about available positions. 
- start=[position] the position on which to start

For example https://blocksarcade.xyz?start=2 will start the player at the first tetris game. 

#### Display Parameters

These allow players to control which of their two eyes blocks are displayed to.

- shapes=[layer]: the layer on which to display falling shapes.
- arena= [layer] : the layer on which to display blocks that have already landed.

[layer] can be set to:

- 0 to display on both eyes
- 1 to display on left eye only
- 2 to display on right eye only.

For example https://blocksarcade.xyz?shapes=1&arena=2 will show falling shapes to the left eye only, and landed shapes to the right eye only.



## Feedback

Any feedback from players of the game is hugely appreciated.  You can offer your feedback in any of the following ways:

- Reach out on Twitter @blocksarcadeVR, or on Reddit r/BlocksArcade with your feedback

- Write a review in Sidequest: https://sidequestvr.com/app/3394/blocks-arcade.  Positive reviews are super-helpful and hugely appreciated!

- Contribute to our feature ideas page here on GitHub: https://github.com/diarmidmackenzie/blocks-arcade/issues

  

#### Feature Requests and Bugs

We track feature requests and bugs on our GitHub issues page: https://github.com/diarmidmackenzie/blocks-arcade/issues

If you have an idea for a feature:

- Check if the idea exists already - if it does, add comments, or a "thumbs up" in support of it.
- If it doesn't exist yet, go ahead and create it.

If you find a bug, please do the same:

- Please first check if the bug has been reported already.  If it has, please add any other information you can that might help up to understand the bug, or give it the right priority.
- If it hasn't, please report it.

I will try to fix bugs quickly.  For new feature requests, the rate of development will depend a lot on the level of engagement this game gets - the more players we have, the more excited I'll be about making enhancements.



## Contributions

This is an Open Source project, and contributions are welcomed.

You do not need to be a developer to contribute...

- You can provide input on bugs & features, as noted above.
- You can offer assets that we could use in the game, whether that's music, sound effects, new environments, new blocks etc.
- Contributions from developers are welcome too...

If you are thinking of contributing code or assets to the project, please get in touch early (see "Feedback" above) so we can check that we are aligned in terms of what you are trying to do before you put too much time & effort into it.



## Licensing

### Code

All scripts and scene files are distributed under the [MIT license](LICENSE.md).  


### Assets

Assets (files in ``assets/``) are distributed under Creative Commons licenses, with specific details as follows:

The background scene:

- fIlename: psych/psych2.jpg: 

- This is a reduced-resolution version of "Psychedelica City Area One" by [Bernd Kromueller](https://www.flickr.com/photos/krofeilz/)

- Original source: ["Psychedelica City Area One"](https://www.flickr.com/photos/krofeilz/14460157987/in/photolist-27wJa2d-24tXpDD-XjRuZG-o2N6bK-UF17Bd)

- License: [Attribution-ShareAlike 2.0 Generic (CC BY-SA 2.0)](https://creativecommons.org/licenses/by-sa/2.0/)



The background music:

- fIlename: music/sb_anewyear.mp3: 
- "A New Year" by [Scott Buckley](https://soundcloud.com/scottbuckley)
- Original source: ["A New Year"](https://soundcloud.com/scottbuckley/a-new-year-cc-by)
- License: [Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)





