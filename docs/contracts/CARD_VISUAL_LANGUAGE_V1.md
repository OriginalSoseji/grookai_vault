# CARD_VISUAL_LANGUAGE_V1

Status: Active

Date: 2026-07-16

## Purpose

Grookai describes collectible artwork.

Grookai does not critique artwork, market artwork, invent lore, or turn visual descriptions into canonical identity. The visual language exists so generated descriptions are consistent, accessible, reviewable, and useful for collectors.

This contract governs the vocabulary, writing style, and observation standards for every future card visual description prompt and review pass.

## Scope

This contract applies to private card visual descriptions and their semantic tags.

It does not create or change:

- database schema
- migrations
- embeddings
- semantic search
- Taste Engine integration
- Listing Resolver integration
- Grookai Signature integration
- canonical identity
- pricing truth
- image truth
- public or app-facing read models

## Core Philosophy

Grookai should describe artwork like:

- a museum curator
- an accessibility specialist
- a collector

Grookai should not describe artwork like:

- a novelist
- a reviewer
- a marketing writer

Descriptions must be objective, grounded, collector-focused, and consistent.

## Observation Hierarchy

Describe visible artwork in this order.

1. Subject: what is being depicted.
2. Structure: how the subject is physically constructed.
3. Pose: how the subject is positioned.
4. Composition: how the artwork is arranged.
5. Environment: what is visibly around the subject.
6. Lighting: visible light, glow, glare, highlights, shadows, or reflections.
7. Palette: dominant visible colors and temperature.
8. Mood: only after observable evidence has been described.

Mood must never replace observation. It may summarize visible cues only after the subject, structure, pose, composition, environment, lighting, and palette are documented.

## Speculation Rules

Do not infer symbolism, lore, emotion, setting, weather, time of day, story, rarity treatment, or physical card finish unless directly visible.

Preferred uncertainty language:

- appears
- visible
- suggests
- cannot be determined
- not clearly visible
- unclear from the scan
- printing treatment uncertain

Avoid authoritative interpretation unless visually provable:

- is clearly
- represents
- symbolizes
- means
- tells the story of
- evokes the lore of

Avoid speculative atmosphere labels unless the image directly supports them:

- cosmic
- celestial
- magical
- enchanted
- mystical
- dreamlike
- portal
- aura
- night sky

Prefer concrete observation:

- dark gradients
- scattered light points
- soft gradients
- radiating lines
- abstract forms
- layered shadows
- glowing highlights
- reflected light
- white flower field
- circular formation

## Vocabulary Standardization

Grookai should use stable terminology for recurring visual elements.

Preferred terms:

| Visible element | Preferred vocabulary |
| --- | --- |
| Glass-like central form | glass body, glass lantern body |
| Curving appendages | curved arms, branching arms |
| Round face area | rounded face, face area, central face |
| Abstract linear bursts | radiating lines |
| Smooth color transitions | soft gradients |
| Nonrepresentational shapes | abstract forms |
| Small bright marks | scattered light points, glowing highlights |
| Repeated circular layout | circular motif, circular formation |
| Human card subject | trainer, visible trainer, human figure |
| Energy symbol | central symbol, eye symbol, energy symbol |
| Visible light reflection | reflected light, glare, highlight |

Avoid unnecessary synonym drift. Similar visual elements should be described with similar wording across cards.

Avoid replacing concrete observation with vague style words such as beautiful, cool, epic, amazing, premium, cinematic, or iconic.

## Writing Style

Use plain English.

Use complete sentences.

Be specific, not ornate.

Prefer this:

> The background contains dark purple gradients, scattered light points, and lighter highlights around the central symbol.

Avoid this:

> The background creates a mystical cosmic aura full of magical energy.

Use collector-relevant detail:

- distinctive pose
- cropping
- angle
- central or off-center subject placement
- visible symbols
- color palette
- repeated shapes
- unusual background elements
- surface or scan uncertainty

## Card-Type Style Guides

### Pokemon

Purpose: describe the Pokemon as a visible creature or object-like living subject before describing the artwork.

Observation order:

1. Creature or object resemblance.
2. Body structure.
3. Face location.
4. Eyes and expression when visible.
5. Limbs, wings, tails, flames, ornaments, or attached anatomy.
6. Pose and movement.
7. Artwork composition and environment.

Preferred terminology:

- creature
- body
- face area
- eyes
- curved arms
- branching arms
- glass body
- flames
- posture
- diagonal composition

Never:

- use the Pokemon name as a substitute for visual description
- describe attached anatomy as a separate held object unless clearly held
- invent eyes, limbs, tails, wings, hands, or expression
- infer lore, typing, attack behavior, or personality

### Trainer

Purpose: describe a visible human trainer or human character as a person, not a generic creature.

Observation order:

1. Visible person or people.
2. Apparent age category only when visible.
3. Hair.
4. Clothing.
5. Face and expression.
6. Posture and gesture.
7. Interaction with visible Pokemon, objects, or environment.
8. Artwork composition, lighting, palette, and mood.

Preferred terminology:

- trainer
- human figure
- hairstyle
- clothing
- expression
- posture
- gesture
- foreground
- background

Never:

- call a trainer a humanoid creature
- infer name, role, emotion, or relationship beyond visible evidence and supplied identity context
- invent off-card Pokemon or objects
- use card mechanics, attacks, or set metadata as visual evidence

### Stadium

Purpose: describe a place, structure, or environment.

Observation order:

1. Environment type.
2. Foreground.
3. Midground.
4. Background.
5. Architecture, landscape, plants, objects, or visible focal points.
6. Lighting.
7. Palette.
8. Mood after observation.

Preferred terminology:

- environment
- garden
- field
- forest
- city
- ruins
- cave
- foreground
- background
- circular formation
- scattered light points
- soft gradients

Never:

- create a character section
- invent Pokemon, crowds, or activity unless visible
- call abstract light points stars unless literal stars are visible
- call the scene magical, celestial, or enchanted unless the visual evidence directly proves it

### Energy

Purpose: describe symbolic or abstract artwork.

Observation order:

1. Central symbol.
2. Symbol shape and placement.
3. Abstract forms.
4. Radiating lines, circular motifs, gradients, and movement cues.
5. Lighting and highlights.
6. Palette.
7. Overall visual theme after observation.

Preferred terminology:

- central symbol
- eye symbol
- energy symbol
- abstract forms
- radiating lines
- circular motif
- soft gradients
- purple gradients
- glowing highlights

Never:

- invent a creature
- describe the symbol as a face or character unless it is visibly drawn as one
- infer lore, powers, attack behavior, or metaphysical meaning
- use type names as semantic tags unless the type symbol itself is visually described

### Tool

Purpose: describe a visible tool, equipment piece, or held object.

Observation order:

1. Object type.
2. Shape and material cues.
3. Placement and scale.
4. Interaction with hands, Pokemon, trainer, or environment when visible.
5. Composition, lighting, palette, and mood.

Preferred terminology:

- tool
- object
- device
- handle
- edge
- surface
- highlight
- reflected light

Never:

- invent a Pokemon user
- infer function beyond visible design
- treat game mechanics as visual evidence

### Supporter

Purpose: describe the visible human, group, or scene shown on a Supporter card.

Observation order:

1. Visible person, people, object, or scene.
2. Clothing, hair, expression, posture, and gesture when human figures are visible.
3. Visible interaction.
4. Environment.
5. Composition, lighting, palette, and mood.

Preferred terminology:

- trainer
- visible person
- group
- gesture
- expression
- setting
- foreground
- background

Never:

- assume every Supporter shows a person if the card shows only an object or scene
- invent an off-card story
- use gameplay role as visual evidence

### Item

Purpose: describe the actual visible object or scene.

Observation order:

1. Main object or scene.
2. Shape, material cues, color, and markings.
3. Placement and scale.
4. Surrounding environment.
5. Composition, lighting, palette, and mood.

Preferred terminology:

- object
- item
- device
- container
- surface
- markings
- central placement
- close-up framing

Never:

- invent a creature or trainer
- infer usage, mechanics, rarity, or lore from the card name alone
- use attack or game text as visual evidence

## Semantic Tag Standards

Semantic tags must represent visible search concepts.

Good tags describe:

- visible subject
- visible object
- environment
- palette
- composition
- lighting
- mood grounded in visual evidence
- distinctive visual detail

Semantic tags must not include:

- set names
- attack names
- rarity names
- card mechanics
- card type metadata
- generic franchise labels
- market data
- grading terms
- invisible lore

Preferred tag examples:

- ghostly chandelier
- purple flames
- trainer portrait
- dynamic pose
- white flowers
- circular formation
- purple gradients
- radiating lines
- abstract forms
- central symbol

## Card Surface And Printing Cues

Only describe reliable visible card-surface or scan cues.

Allowed examples:

- silver border visible
- glare prevents determination
- foil texture cannot be determined
- embossing not visible
- printing treatment uncertain

Avoid generic statements such as standard trading card borders.

## Future Expansion Placeholders

This V1 contract is written for Pokemon TCG card visual descriptions.

Future contracts may extend the same philosophy and observation rules to:

- Sports cards
- Magic: The Gathering
- Yu-Gi-Oh
- One Piece
- Lorcana

Do not implement those expansions under this V1 contract.

## Prompt Governance

Future prompts must conform to this contract.

Prompt changes should refine implementation details, not redefine Grookai's visual language, unless this contract is explicitly revised.

Major prompt architecture changes require a separate checkpoint and validation artifact.

## Review Gate

Generated descriptions remain private derived intelligence until separately reviewed and approved.

This contract does not approve any generated row, create embeddings, expose app-facing reads, or authorize downstream integrations.
