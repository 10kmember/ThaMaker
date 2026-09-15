# The PALMA trophies

A brief a foundry can quote from. Every dimension, alloy and finish is stated,
and the drawings are generated from the same palm geometry the website uses, so
the object and the mark cannot drift apart.

![The three trophies in front elevation](trophies/palma-trophies.png)

---

## The idea the family rests on

**Two objects**, one palm, and the hierarchy is the crown:

|                    | What it carries                                      |
| ------------------ | ---------------------------------------------------- |
| **THE PALMA**      | The whole palm, four frond pairs, **and the crown**. |
| **Category PALMA** | The same palm. **No crown.**                         |

That is the whole system, and it reads across a room in a photograph, which is
where most people will ever see these. Nobody has to be told which is which.

There is no third object. A finalist is recognised by being named, and a family
of three was one thing too many to hold in the head.

The crown matters because on the mark it is not a leaf: it is a struck dot held
clear above the spine. Making it the thing only the highest honour carries turns
a drawing convention into the most valuable 16 mm of bronze in the institution.

### It is a cross in plan, not a pressing

One set of fronds sits in the plane of the mark; a second set sits at ninety
degrees to it. Head-on you see the logo exactly. From anywhere else you see a
palm rather than a cutout of one, which is the difference between an object and
a silhouette on a stick.

### What earlier versions got wrong

A figure on a tiered plinth, which is what every corporate award has been for
thirty years. The hierarchy carried by a materials difference (full round
against half relief) nobody would notice. Almost half the palm left as bare
stalk below the lowest fronds. All three are gone: the palm is socketed deep
into the seal, so what shows below the lowest fronds is a hand's width.

---

## THE PALMA

**400 mm · 2.9 kg · one a year · never shared**

![THE PALMA, with details called out](trophies/the-palma-detail.png)

### The palm

- **Material.** Silicon bronze, sand-cast, **one piece**. Not plated, not resin,
  not a bronze-coloured finish. The weight is part of the object.
- **Height.** 288 mm, spine socket to the top of the crown.
- **Spine.** Round section, **22 mm** at the socket tapering to **6 mm** where
  the needle leaves it. Circular throughout, so it feels the same in the hand
  from any angle.
- **Fronds.** Four opposed pairs, each a swept round rod of **7 mm** at the
  spine, 5.5 mm at mid-span, closing to a **4 mm hemisphere** at the tip.
  Nothing on this object is cut off flat. The lowest pair spans 150 mm tip to
  tip and each pair above gains 12 mm, so the crown pair spans 186 mm.
- **The crown.** A **16 mm** sphere held **12 mm clear** of the spine on a
  needle that tapers out of it, finishing at 3 mm. It should read as struck and
  separate. Only THE PALMA carries it.

### Two finishes, one casting

The single decision that makes this object photograph:

- **Upper faces of the fronds and the crown:** hand-polished to a mirror.
- **Undersides, spine and needle:** fine bead-blast, left dark under patina.

An awards photograph has one light, and it is overhead. A uniformly polished
palm turns into a flare; a uniformly dark one disappears. This one lights along
its upper edges and holds its shape, which is what the engraved mark does on
paper.

Patina: warm mid-brown, **waxed rather than lacquered**. It will darken with
handling over years, and that is correct. The object should look like it has
been owned.

### The seal

Not a block. A **turned bronze disc**, Ø150 × 42 mm, faced on a lathe with a
shallow dome across the top and a quarter fillet down to the rim. A block is
joinery; a struck, turned disc is the object PALMA's whole verification language
already describes, and the palm is socketed into its centre rather than standing
on it.

- Standing on a **thin English oak ring foot**, Ø132 × 10 mm, quarter-sawn,
  hard-wax oiled. It keeps the piece warm in the hand and stops the bronze
  ringing against a table.
- Ballasted with lead shot in the turned cavity if the finished piece comes in
  under **2.4 kg**. Heft is the difference between an award and a souvenir.

### The plate

Let into the **rim of the seal** flush at 3 mm, so a fingertip crossing it feels
an edge and not a step. Solid brass, 1.5 mm, satin, **96 × 13 mm**, curved to
the rim.

Deep-etched and oxide-filled in ink black — **not laser-marked**. Laser marking
sits on the surface and wears off a plate that gets handled, and this one will
be handled for decades.

```
              THE PALMA · 2027
                AMA OKONKWO
```

### The code, underneath

`PM-2027-XXXXXX · palmaawards.com/verify` engraved on the **underside** of the
block. It is proof, not decoration, and it should be found by somebody who turns
the object over looking for it.

---

## The Category PALMA

**265 mm · 1.4 kg · one per category**

The same palm, the same casting, the same cruciform plan and the same two
finishes, at **184 mm**. **No crown:** the spine tapers and simply ends.

- Seal: turned bronze, **Ø116 × 32 mm**, on an oak ring foot.
- Plate: brass, let into the rim, 72 mm, carrying the category, the year and
  the winner.
- Code on the underside, as above.

### Where a sponsor may and may not appear

A category may be presented by a partner. If it is, the partner's name appears
**on the certificate and in the programme, never on the trophy.** The object in
a winner's hands carries PALMA's mark, the category, the year and their name,
and nothing that was paid for.

This is not a style preference. It is the same line the software enforces: a
sponsor buys association with the category, not a share of the recognition.

---

## The certificate, for both

A5 landscape, 300 gsm mould-made cotton, letterpressed in ink black with the
palm **blind-embossed** — no ink, pressure only — at 42 mm.

Two signatures: the chair of the panel and one administrator, which is the same
two-person rule the software applies to conferral. The verification code is set
at the foot in monospace with the verify URL beneath it.

Blind embossing is the detail worth paying for. It cannot be photocopied, it
cannot be reproduced by a home printer, and it is felt before it is seen.

---

## What none of these are

- **Not crystal-and-chrome.** The bevelled acrylic obelisk is the corporate
  award of the last thirty years, and PALMA's whole position is that it is not
  that kind of institution.
- **Not gold plated.** Plating chips, and a chipped award is worse than a plain
  one. Solid brass and bronze age; plate fails.
- **Not resin, anywhere.** If cost pressure forces a change, the correct answer
  is fewer categories, not a lighter object.
- **Not engraved after the fact.** The name goes on before the ceremony, which
  means the winner is known to the workshop before the room. The foundry holds
  that under the same terms as the panel.

---

## The drawings

`docs/trophies/` holds both sheets as PNG and SVG, and the two scripts that
generate them.

```
node docs/trophies/draw-elevation.mjs   # both, to scale, with the plan
node docs/trophies/draw-detail.mjs      # THE PALMA, with callouts
```

They import the palm paths from the same source the site renders — see
`src/components/brand/geometry.ts`. **Redraw rather than retouch.** A trophy
drawing edited by hand is how the object and the mark quietly stop being the
same palm, which has already happened once to this institution's logo.
