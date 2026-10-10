# Swim Meet

A public record of swimmers' meet schedules and times, kept up to date by signed-in editors before, during, and after each meet.

## Language

### Competition

**Meet**:
A swimming competition held over one or more consecutive days in a single course.
_Avoid_: Competition, gala, tournament

**Course**:
The pool configuration a meet is swum in: SCY, SCM, or LCM.
_Avoid_: Pool type, course type

**Stroke**:
The style swum in an event, including IM and the two relay kinds.
_Avoid_: Event type, style

**Event**:
One valid combination of course, stroke, and distance, such as SCY 100 Freestyle. Catalog data, not something that happens at a meet.
_Avoid_: Race, swim

**Round**:
The stage of an event at a meet: timed final, prelim, final, or swim-off.
_Avoid_: Heat, session

**Entry**:
A swimmer signed up for one event and round at one meet. An entry with no result is upcoming.
_Avoid_: Upcoming event, registration, swim

**Result**:
The outcome of an entry: a status plus any times recorded.
_Avoid_: Swim log, time record

**Status**:
How an entry ended: swum, disqualified, no show, or scratched.

### Times

**Live time**:
The time read off the scoreboard or meet app during the meet, before officials confirm it.
_Avoid_: Unofficial time, scoreboard time

**Official time**:
The time confirmed by USA Swimming, entered by hand or imported.
_Avoid_: Final time, verified time

**Seed time**:
The time a swimmer was entered with, used to show the drop after the swim.
_Avoid_: Entry time

**Personal best**:
A swimmer's fastest official time in an event from a swum, individual result. Relays and disqualified swims never count.
_Avoid_: PB time, best time, record

**Provisional personal best**:
A live time that would be a personal best if it becomes official.

**Motivational standard**:
A USA Swimming time cut (B through AAAA) for an event, age group, and gender.
_Avoid_: Time standard, cut, level

### People

**Swimmer**:
A person whose entries and results are tracked. Publicly identified by first name only.
_Avoid_: Athlete, kid

**Owner**:
The account that created a swimmer and controls who else can edit them.

**Editor**:
An account allowed to change a swimmer's entries and results: the owner, anyone the owner shared with, or an admin.
_Avoid_: Manager

**Admin**:
The account that can edit everything and delete meets.

**Legacy**:
The pre-rewrite tables held in the `legacy` database schema, kept only as a source for a future data migration.
