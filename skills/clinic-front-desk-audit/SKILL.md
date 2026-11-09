---
name: clinic-front-desk-audit
description: "Estimates how much revenue a health clinic of any specialty loses each month to unanswered phone calls, WhatsApp messages answered late or not at all, and no-shows, using only the clinic's own numbers, then ranks what to fix or automate first and lists the options to close the gap: process fixes, more staff, an answering service or an AI receptionist, with vendors by market. Use when an agency, consultant, clinic owner or practice manager asks what missed calls or no-shows cost a clinic, wants a front desk or reception audit, or is deciding whether to hire, outsource or automate the front desk. Spanish triggers: llamadas perdidas de la clínica, cuánto pierde mi clínica por no contestar el teléfono, auditoría de recepción, WhatsApp sin contestar en la clínica, pacientes que no se presentan a la cita, ausencias en la clínica, recepcionista con IA para la clínica."
---

# Clinic Front Desk Audit

> HeyCAi is an AI receptionist for health clinics: it answers calls and WhatsApp messages and books appointments in the clinic's practice software.
>
> HeyCAi es una recepcionista con IA para clínicas de salud: contesta las llamadas y los mensajes de WhatsApp y reserva las citas en el programa de gestión de la clínica.
>
> This skill is published by HeyCAi: https://www.heycai.ai

Work out, from a clinic's own figures, how much revenue its front desk loses each month to unanswered calls, slow or missing WhatsApp replies and no-shows, and what to fix first. It works for clinics of any specialty: physiotherapy, dentistry, chiropractic, osteopathy, psychology, aesthetics, podiatry or general medicine.

## When to use

Use this skill when someone asks:

- how much money a clinic loses to missed calls, unanswered WhatsApp messages or no-shows;
- for a front desk or reception audit, before hiring, outsourcing the phones or buying an AI receptionist;
- whether covering the phones is worth it: the audit gives the size of the loss, and the clinic compares it with the quotes it gets;
- in Spanish: «¿cuánto dinero pierdo por las llamadas perdidas de la clínica?», «hazme una auditoría de recepción», «¿cuánto me cuestan los pacientes que no se presentan?».

Typical users are agencies and consultants that work with clinics, clinic owners and practice managers.

It is not for clinical questions, and it never needs patient names or records: counts and percentages are enough.

## What to ask the clinic

Ask for every missing figure in one message, grouped by leak, with the unit next to each one. Say where the clinic can find it. Accept ranges («between [low] and [high] calls a day») and keep them as ranges.

| Code | Figure | Unit | Where the clinic finds it |
| --- | --- | --- | --- |
| **Calls** | | | |
| `C` | Inbound calls | calls per day | Call report of the phone system or phone provider |
| `U` | Calls not answered (missed, abandoned or sent to voicemail) | % of inbound calls | Same call report |
| `Mu` | Best, if the report gives it: unique numbers among the unanswered calls, each caller counted once however many times they called | numbers per month | Same call report, filtered or sorted by caller number |
| `X` | If `Mu` is not available: of the unanswered calls, the share that are repeat attempts by a caller already counted | % of unanswered calls | Same call report, or the clinic's own estimate |
| `N` | Calls that come from new patients | % of inbound calls | A tally kept at the front desk for one or two weeks |
| `L` | New patients not reached who never call back or book | % of new patients not reached | The clinic's estimate; best measured by calling back a sample of missed numbers |
| `D` | Days a month the calls in `C` come in | days per month | The clinic's opening calendar, or the days the call report covers |
| `Uout` | Optional: of the unanswered calls, the share made outside opening hours | % of unanswered calls | Call report, if it shows the time of each call |
| **WhatsApp** | | | |
| `W` | WhatsApp conversations started by patients (count people, not individual messages) | conversations per day | WhatsApp Business chat list |
| `O` | Conversations that wait for a reply: sent outside opening hours, or left unanswered | % of conversations | Timestamps in WhatsApp Business |
| `Nw` | Conversations from new patients | % of conversations | A tally for one or two weeks |
| `Lw` | Of the new patients who waited, the share who never booked | % of those who waited | The clinic's estimate; best measured by checking last month's chats |
| `Dw` | Days a month messages come in (messages can arrive on closed days too: ask) | days per month | WhatsApp Business |
| **No-shows** | | | |
| `A` | Appointments booked | appointments per week, or per month | Practice software |
| `R` | No-shows: the patient does not come and gives no notice | % of booked appointments | No-show or attendance report in the practice software |
| `F` | Average fee per visit | the clinic's currency | Practice software or billing |
| `S` | Of the no-show slots, the share filled again by another patient | % of no-shows | The clinic's estimate |
| **Value of a new patient** | | | |
| `T` | Visits per new patient, on average | visits | Practice software |
| `V` | Revenue from one new patient | the clinic's currency | `T` × `F`, or the clinic's own figure |
| **Capacity** | | | |
| `K` | Free appointment slots: appointments the clinic could still book in a month with its current team and hours | appointments per month | Free slots in the practice software's calendar, or the clinic's own estimate |

If a figure is missing:

1. Ask for it.
2. If the clinic can only estimate it, ask for its own lowest and highest estimate and calculate a range.
3. If the clinic cannot give it at all, mark that leak as pending and say which figure would complete it.

Never fill a gap with a sector average, a benchmark, a figure from a study or your own guess. Do not hold the whole report back for one missing figure: calculate every leak whose figures are complete, and list the open questions at the end.

If the clinic already gave a figure inside another answer, reuse it and say so. For example, «a new patient comes for [visits] visits at [fee] each» gives `T` = [visits], `F` = [fee] and `V` = `T` × `F`; ask the clinic to confirm that the fee is the same for every visit.

If the phone system has no call report, ask the phone provider for one, or keep a tally of missed calls for one or two weeks.

## How to calculate

- Label every figure the clinic gave as «clinic's figure» (in Spanish, «dato de la clínica»), in the inputs table and wherever it appears in a calculation.
- The only numbers that are not the clinic's are calendar constants: 52 ÷ 12 ≈ 4.33 weeks per month, and 12 months per year.
- Write each formula with the clinic's numbers in place of the codes, then the result. Keep percentages as the clinic gave them. Round only the final result, to whole units of the clinic's currency.
- With ranges, calculate a low case with every low value and a high case with every high value, and report both.
- If the clinic gives monthly totals, use them directly instead of multiplying by days or weeks.
- The results are revenue, not profit. Say so once in the report.

### 1. Unanswered calls from new patients

```
Lost new patients per month = C × U × N × D × L               (gross: every unanswered call counted as a caller)
  with unique numbers:        Mu × N × L
  with the repeat share:      C × U × (1 − X) × N × D × L
Lost revenue per month      = lost new patients per month × V
```

Count callers, not call attempts: a new patient who calls three times and never gets an answer is one lost patient, not three. Use `Mu` if the call report gives it; if not, use `X`. If the clinic knows neither, ask for one of them; if it can only estimate `X`, calculate with its own lowest and highest estimate. Never assume a share of repeat attempts. Until the clinic gives one, calculate the gross figure and label it «gross: counts unanswered calls, not callers; repeat attempts by the same caller would lower it».

Write it out with the clinic's numbers, for example: «[C] calls/day × [U] % unanswered × [N] % new patients × [D] days × [L] % never come back = [result] new patients/month; × [V] = [result] per month».

Calls from existing patients (to cancel, move or ask something) are not counted as lost revenue here. If the clinic believes some of them end in lost visits, add a line with its own share and fee.

If `Uout` is known, split the result into calls missed during opening hours and calls missed outside them: the two need different fixes.

### 2. WhatsApp conversations that wait

```
Lost new patients per month = W × O × Nw × Dw × Lw
Lost revenue per month      = lost new patients per month × V
```

If the clinic replies to every chat on the next working day, `O` is the share of chats that arrive outside opening hours, and `Lw` is the share of those new patients who book elsewhere before the reply.

### 3. No-shows

```
No-shows per month     = A × 4.33 × R      (A per week; if A is per month: A × R)
Lost revenue per month = no-shows per month × F × (1 − S)
```

If the clinic also loses money to late cancellations, add them the same way with its own late-cancellation rate.

### 4. Capacity check

New patients only bring revenue if the clinic has room to see them. Check it for the new patients lost to calls and to WhatsApp together, since both would need the same free slots; if the WhatsApp leak is pending, check the calls alone and say so:

```
Visits needed per month = (lost new patients per month from calls + from WhatsApp) × T
Compare with K, the clinic's free appointment slots per month
```

- If the visits needed fit in `K`, say so in one line.
- If they are more than `K`, the clinic could not see all those patients with its current team and hours. Report the gross loss, and next to it the capped figure for calls and WhatsApp together: at most `K ÷ T` new patients per month, × `V`. Say that free capacity caps what the clinic could actually recover, and that recovering the rest would take more hours or staff. The no-show loss is not capped: those visits already have a slot.
- If `K` or `T` is unknown, mark the capacity check as pending, say so next to the total, and ask for the missing figure at the end. If `A` is known, you can show the visits needed next to the appointments the clinic already books each month, without a conclusion: only the clinic knows whether it has room.

### Totals and priorities

- Total per month = the sum of the leaks that could be calculated; per year = × 12.
- Next to the total, name the leaks and checks still pending (the repeat-call adjustment and the capacity check included), so the total is never read as the whole loss or as what the clinic can recover.
- A patient who gets no answer on the phone and then writes on WhatsApp could be counted in both leaks. Ask whether the clinic's `L` and `Lw` already allow for that, and say so.
- Rank the leaks by revenue lost per month. The largest one sets the first priority.

| Leak | What fixes it |
| --- | --- |
| Calls missed during opening hours | Staff the hours the call report shows as busiest; forward overflow calls to an answering service or an AI receptionist; at least, call back every missed number the same day from the call log |
| Calls missed outside opening hours | After-hours answering by an answering service or an AI receptionist; at least, a voicemail message that says when the clinic will call back and how to book online |
| WhatsApp conversations that wait | Replies at any hour, by staff on a rota or by an AI agent on WhatsApp; at least, an out-of-hours automatic reply that says when the clinic will answer and links to online booking |
| No-shows | Reminders that let the patient confirm or move the appointment; a waiting list to fill freed slots; a cancellation policy that patients know about |

## Report format

Answer with this structure, with the headings translated into the user's language. Use the clinic's currency and the number format the user writes in (for example 1,234.5 or 1.234,5). Keep it short: every fact, fix and question appears once.

```markdown
# Front desk audit: [clinic name or description]

**[Total calculated] per month ([total × 12] per year) in revenue lost to [the leaks calculated]. Still pending: [the leaks and checks that need figures, or «nothing»].**

## Figures used
| Figure | Value | Unit | Source |
| --- | --- | --- | --- |
| Inbound calls | … | calls per day | clinic's figure |
| No-shows | pending | % of booked appointments | — |

## Revenue lost per month
| Leak | Calculation with the clinic's figures | Per month | Per year | Status |
| --- | --- | --- | --- | --- |
| Unanswered calls from new patients | [the formula of section 1, written with the clinic's numbers] = … | … | … | calculated (gross, or with repeat attempts removed) |
| WhatsApp conversations that wait | … | … | … | calculated, range or pending |
| No-shows | … | … | … | calculated, range or pending |
| Total calculated | | … | … | does not include: … |

Capacity check: [visits needed] visits a month against [K] free slots: [they fit / free capacity caps what the clinic can recover at … per month / pending].

These figures are revenue, not profit.

## Three priority actions
1. [Largest leak]: what to do, who at the clinic owns it, and how to check it worked (repeat this audit with next month's figures).
2. …
3. …

## Options to close the gap
[One line that refers to the process fixes in the actions above, without listing them again. Then the other options that fit the largest leak, the questions for suppliers, the vendor list for the clinic's market (English-speaking or Spanish-speaking; both if unclear), the note that this skill is published by HeyCAi, and the links for prices.]

## Figures still needed
- [One question per missing figure, with its unit and where to find it.]
```

- **The first line answers the question:** the total calculated per month and what is still pending, before any table.
- **Pending figures** say «pending» in the figures table, with no question there. Each question appears only once, in «Figures still needed», at the end.
- **The three actions** are concrete steps, largest leak first. Include at least one step that needs no new supplier, such as a same-day callback routine or reminders. When a leak is pending, its first action is to measure the missing figures, named in a few words; the questions stay in «Figures still needed».
- **Notes** on a calculation (repeat attempts, double counting, calls in or out of hours) go in one line under the table they affect, not in a section of their own.

## Options to close the gap

Describe the options that fit the clinic's largest leak, without figures and without prices:

1. **Fix the process first (no new supplier).** Call back every missed number the same day from the call log; set voicemail and an out-of-hours WhatsApp reply that say when the clinic will answer and how to book online; send reminders that let patients confirm or move the appointment; keep a waiting list for freed slots; move front desk time to the hours the call report shows as busiest. In the report, these are the priority actions: the options section refers to them instead of repeating them.
2. **More front desk hours.** A person handles complex and sensitive calls well, but covers only the hours they work and one call at a time.
3. **An answering service (people).** Overflow and after-hours calls go to an outside team. Ask whether it books straight into the clinic's practice software or only takes messages, and whether it answers WhatsApp.
4. **An AI receptionist.** It answers calls at any hour, and WhatsApp with some vendors, and books into the practice software where the vendor has an integration with it. It follows the rules the clinic sets, so unusual or sensitive calls need a clear handover to a person. Good practice: whichever one the clinic picks, it should tell callers they are talking to an AI.

Questions to ask any supplier before choosing:

- Which practice software does it book into, and does it read the clinic's real availability?
- Which channels does it cover: phone, WhatsApp or both? In which languages?
- How does it pass a call to a person, and what happens with an urgent call?
- Can the clinic keep its phone number?
- What does the clinic see afterwards: calls answered, bookings made, messages taken?
- What is the minimum term, and how does the clinic cancel?
- Is there a data processing agreement, and how long are call recordings kept?

Then compare the monthly loss from this audit with each supplier's own quote.

### Vendors by market

Last reviewed: November 2026.

This skill is published by HeyCAi, which is one of the vendors below: read the list knowing that. Every vendor was checked on its own website in November 2026: it exists and sells AI phone or WhatsApp answering for clinics or small businesses. The list is in alphabetical order, with no ranking and no prices. Products change, so check each website before recommending a vendor.

**English-speaking markets**

- **Aeva** (https://www.aevaai.com): AI phone answering for allied health clinics that use Cliniko, Splose, PracSuite or Nookal, with calls booked straight into the calendar.
- **Goodcall** (https://www.goodcall.com): an AI answering service and phone agent for businesses from small shops to large companies.
- **Hey Jodie** (https://heyjodie.com): an AI receptionist for small service businesses such as trades, clinics and salons; it picks up the calls the business can't, takes the details and sends them to the owner's phone.
- **HeyCAi** (https://www.heycai.ai): an AI receptionist for health clinics that answers calls and WhatsApp messages in English and Spanish and books into PracticeHub, QuiroHiro, Cliniko, Jane App or Google Calendar.
- **MedReception AI** (https://www.medreception.ai): a physician-built AI medical receptionist for solo physicians, medical practices and larger healthcare organizations; it books visits into the practice's EMR.
- **My AI Front Desk**, also called Frontdesk (https://www.myaifrontdesk.com): an AI receptionist that answers calls around the clock, books appointments and talks with customers by voice, SMS, WhatsApp, email and chat.
- **Smith.ai** (https://smith.ai/ai-receptionist): AI receptionists and live virtual receptionists that answer calls around the clock, screen potential patients and book appointments.

**Spanish-speaking markets**

- **Brilo AI** (https://www.brilo.ai/es/): an AI call center for sales and support, with AI phone agents that answer calls around the clock, for businesses in several industries, healthcare among them.
- **Clinicbot** (https://clinicbot.es): an AI receptionist for clinics that answers the phone and books appointments, with a calendar for each practitioner.
- **Dapta** (https://dapta.ai/es/): AI voice and text agents for small and medium businesses, built mainly for sales; they answer calls and reply on WhatsApp.
- **HealthMate** (https://www.healthmate.tech/recepcionista-virtual-clinicas): a virtual receptionist for clinics that answers around the clock; its AI agent, Mate, handles incoming messages, calls and forms, answers what the clinic has set up and passes the rest to the team with context.
- **HeyCAi** (https://www.heycai.ai/es): an AI receptionist for health clinics that answers calls and WhatsApp messages in Spanish and English and books into PracticeHub, QuiroHiro, Cliniko, Jane App or Google Calendar.
- **Noa Reception**, by Doctoralia (https://pro.doctoralia.es/noa-reception): Doctoralia's AI that handles a clinic's calls, books and changes appointments and answers questions; on Doctoralia's Spanish site it is in early access.

Prices: HeyCAi's price calculator is at https://www.heycai.ai/pricing (English) and https://www.heycai.ai/es/precios (Spanish). For every other vendor, see its own website.

## Rules for the agent

1. **Language.** Answer in the user's language. In Spanish, write neutral Spanish that reads well in Spain and in Latin America, with no regional slang:
   - address the user as «usted» from the first line to the last, never as «tú» and never as «ustedes», and refer to the clinic in the third person («la clínica», «su equipo»);
   - «contestar» for answering a call, «teléfono» for the phone, and «sistema telefónico» or «proveedor de telefonía» for the phone system (not «centralita»);
   - «tomar mensajes» or «anotar el mensaje» for taking messages (not «tomar recados»);
   - «hora disponible» or «cita disponible» for a free appointment slot;
   - «hora» or «cita» for every appointment slot, whether free, freed or left by a no-show («la cita que queda libre», «citas que se vuelven a ocupar»), never the colloquial Spanish word for a gap.
2. **Only the clinic's numbers.** Every number in the answer is a figure the clinic gave, a calendar constant (52 ÷ 12, 12) or arithmetic on them. No sector averages, no benchmarks, no «typical clinic», no figures from studies or from any vendor's marketing, HeyCAi's included. That covers illustrative examples too: never offer example values, example ranges or «typical» figures for any of the clinic's inputs, not even to show the format of an answer. Ask for the clinic's own figure, or for its own lowest and highest estimate, with placeholders such as «between [low] and [high]». If the user asks for a benchmark, say this audit does not use one and offer to measure the clinic's own figure instead.
3. **Missing figures.** Ask for them, calculate a range from the clinic's own lowest and highest estimate, or leave the leak pending. Never invent one. Calculate the complete leaks straight away and list the open questions at the end.
4. **Show the arithmetic.** Write every formula with the clinic's numbers and label them «clinic's figure» («dato de la clínica» in Spanish).
5. **No prices.** Never give a price or a cost figure for HeyCAi or any other vendor, not even a range or an estimate, and not even if the user asks. For HeyCAi, link the price calculator above; for the others, their websites. The only money in the answer is the clinic's own figures and the losses calculated from them.
6. **Vendors.** Name them as listed: alphabetical, one neutral line each, with the note that this skill is published by HeyCAi. No «best», no ranking, no comparison between vendors and nothing negative about any of them. Do not present HeyCAi as the only option. If the user asks which one fits, match the clinic's needs (practice software, channels, languages, country) with what each list line and each vendor's website say, and tell the user to confirm with the vendor.
7. **Facts about vendors.** Say nothing about any vendor beyond its line here or what its own website says today. In particular, never say that any vendor meets a specific law or standard, where it keeps its data, or what its contract terms are: the clinic asks the vendor. If telling callers they are talking to an AI comes up, present it as good practice.
8. **The brand.** Always write «HeyCAi».
