# To Do

- [ ] Add bundling to use on any page

# Nice to have

Life's too short for perfection

- [ ] Make closest actor pick up the debris (See if it still looks good and chaotic and not _too ordered_)
- [ ] Some rats make a placement mistake (wrong piece) and afterwards repair that mistake
- [ ] Instancing with ANGLE\_ extension to pass matrices as an array
- [ ] More realistic explosion dynamics
- [ ] On explode have a full screen white rect appear immediately and fade out to transparency
- [x] Rats jumping around the logo in a circle (Rotating around as time passes)
- [ ] Add back sprites/flies with some flocking
- [ ] Better cheese texture mapping
- [ ] Add lights
- [ ] Distort cheese pieces a bit in the shader (random hash)

# Bugs

- [x] Fix z-fighting on cheese sign

# Perf bottlenecks

- DrawTexturedMesh
    - bindBuffer -> sort by mesh
- ApplyStencil gl.clear
