# External Visual Source Partnership Outreach V1

## Objective

Request stable, permission-backed exports or APIs from visual-search community
projects without copying their card images, bypassing their terms, or treating
their classifications as Grookai truth.

## Common Request

Ask each owner for:

- permission to store and transform the supplied metadata;
- permitted commercial and non-commercial product uses;
- whether user-contributed labels may be sublicensed or displayed;
- stable source record IDs;
- export/API format and rate limits;
- refresh and deletion cadence;
- attribution requirements;
- correction and revocation workflow;
- whether derived normalized concepts may be retained after a source row is
  removed;
- a dated written permission or license document.

Grookai should offer:

- visible source attribution and deep links in evidence panels;
- no copying of source-hosted card images;
- bounded refreshes rather than scraping;
- canonical card-print crosswalk files;
- correction and mismatch reports;
- aggregate coverage reports;
- a kill switch for the source adapter;
- deletion or deactivation handling for revoked records.

## SightDex

Requested export:

```text
source_record_id
card identity: set, name, number, language
represented Pokemon
SightDex role: featured, cameo, object
consensus state and independent vote count
source URL
updated_at
```

Requested enhancement:

- split `object` into plush/toy/statue/food/logo/pattern versus
  poster/screen/photo/sign;
- identify host object or surface when known;
- distinguish reflection/silhouette from a separate visible scene subject.

Grookai use:

- stage appearance candidates;
- prioritize high-consensus records;
- confirm identity, role, and host against the self-hosted image;
- publish only founder-confirmed or explicitly role-confirmed assertions.

## Artchu

Requested export:

```text
tag_id
tag_label
tag_family: scene, object, action, composition, style, mood, cameo
card identity
tag origin and confidence
source URL
updated_at
```

Requested taxonomy split:

- objective visible tags;
- semantic or interpretive tags;
- editorial selections;
- identity/cameo tags.

Grookai use:

- normalize objective vocabulary;
- build optional semantic concepts;
- create source-backed evaluation queries;
- stage card-level candidates only when the agreement permits it.

## TCG Curator

Requested export:

```text
tag_id
tag_label and tag category
card identity
upvote and downvote totals
consensus status
Pokemon appearance tags
source URL
updated_at
```

Requested governance details:

- rights attached to community-contributed tags;
- whether vote totals and card-tag mappings may be stored;
- how removed or disputed tags are represented.

Grookai use:

- expand collector vocabulary and query evaluation;
- prioritize candidates by community agreement;
- keep votes as review priority, never evidence authority;
- independently confirm every search-facing role.

## BinderBloom

Requested export:

```text
panorama_group_id
member card identities
member order
relationship confidence
English/Japanese artwork linkage
source URL
updated_at
```

Optional aggregate data:

- palette vectors or normalized dominant colors, if BinderBloom owns and may
  license them;
- no source-hosted card image transfer is required.

Grookai use:

- stage connected-artwork relationship candidates;
- support panorama search and binder composition after a separate relationship
  contract;
- never translate panorama membership into character-appearance evidence.

## Approval Artifact

Before enabling an adapter, preserve:

```text
source registry key
owner identity
permission document
permission status
terms snapshot
terms SHA-256
reviewed_at
allowed fields
allowed uses
attribution text
refresh limit
deletion/revocation policy
adapter version
```

## Stop Rule

No response, unclear rights, or a public website without an export agreement
means research-only use. It does not authorize automated acquisition.

