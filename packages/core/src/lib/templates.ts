// Remember to translate
export const initialTemplate = () => `<h2>Yleistiedot:</h2>
<ul>
  <li>[Reason for visit and observed symptoms] (only include if explicitly mentioned during the visit)</li>
  <li>[Duration, location and severity of symptoms] (only include if explicitly mentioned during the visit)</li>
  <li>[Previous treatment attempts and their effectiveness] (only include if explicitly mentioned during the visit)</li>
</ul>

<h2>Tutkimus:</h2>
<ul>
  <li>[Physical examination findings] (only include if explicitly mentioned during the visit)</li>
  <li>[Completed tests and their results] (only include completed tests with results that were explicitly mentioned during the visit)</li>
  <li>[Vital signs measurements] (only include if explicitly mentioned during the visit)</li>
</ul>

<h2>Diagnoosi:</h2>
<ul>
  <li>[Confirmed conditions or problems] (only include if explicitly mentioned during the visit)</li>
  <li>[Possible differential diagnoses] (only include if explicitly mentioned during the visit)</li>
</ul>

<h2>Hoitosuunnitelma:</h2>
<ul>
  <li>[Planned further diagnostics] (only include if explicitly mentioned during the visit)</li>
  <li>[Prescribed treatments and medications] (only include if explicitly mentioned during the visit)</li>
  <li>[Follow-up visits and care instructions] (only include if explicitly mentioned during the visit)</li>
  <li>[Discussed costs] (only include if explicitly mentioned during the visit)</li>
</ul>

(Include only information explicitly mentioned during the visit. Do not add your own conclusions or recommendations - use only matters discussed during the visit. The response MUST be in HTML format with proper tags for headings (<h2>), lists (<ul>, <li>), and paragraphs (<p>).)`;

export const summaryTemplate = () => `<h2>Potilaan tiedot:</h2>
<ul>
  <li>[Species, breed, name, and age] (only include if explicitly mentioned during the visit)</li>
</ul>

<h2>Yhteenveto:</h2>
<ul>
  <li>[Primary complaint and key symptoms] (only include if explicitly mentioned during the visit)</li>
  <li>[Significant clinical findings] (only include if explicitly mentioned during the visit)</li>
  <li>[Relevant test results] (only include completed tests with results that were explicitly mentioned during the visit)</li>
</ul>

<h2>Diagnoosi & hoitosuunnitelma:</h2>
<ul>
  <li>[Confirmed diagnosis/working diagnosis] (only include if explicitly mentioned during the visit)</li>
  <li>[Key treatments and medications prescribed] (only include if explicitly mentioned during the visit)</li>
  <li>[Essential follow-up instructions] (only include if explicitly mentioned during the visit)</li>
</ul>

<h2>Huomiot:</h2>
<ul>
  <li>[Critical information for future reference] (only include if explicitly mentioned during the visit)</li>
</ul>

(Include only information explicitly mentioned during the visit. Do not add your own conclusions or recommendations - use only matters discussed during the visit. The response MUST be in HTML format with proper tags for headings (<h2>), lists (<ul>, <li>), and paragraphs (<p>).)`;

export const preliminaryTemplate = () => `<h2>Esitiedot
:</h2>
<ul>
  <li>[Species and breed] (only include if explicitly mentioned during the intake)</li>
  <li>[Name and age] (only include if explicitly mentioned during the intake)</li>
  <li>[Gender] (only include if explicitly mentioned during the intake)</li>
  <li>[Living environment] (only include if explicitly mentioned during the intake)</li>
  <li>[Previous illnesses and vaccination history] (only include if explicitly mentioned during the intake)</li>
  <li>[Behavioral observations and any special needs] (only include if explicitly mentioned during the intake)</li>
  <li>[Any current symptoms or health concerns] (only include if explicitly mentioned during the intake)</li>
</ul>

(Include only information explicitly mentioned during the visit. Do not add your own conclusions or recommendations - use only matters discussed during the visit. The response MUST be in HTML format with proper tags for headings (<h2>), lists (<ul>, <li>), and paragraphs (<p>).)`;

export const initialTemplateFullSentences =
  () => `<h2>Yleistiedot</h2> (Write everything below this sub-heading as a complete coherrent section with professional terminology.)
<p>[Patient identification and basic information]. Please write this as a complete, professional sentence.</p>
<p>[Reason for visit and observed symptoms] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence describing the presenting complaints.</p>
<p>[Duration, location and severity of symptoms] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence detailing the history.</p>
<p>[Previous treatment attempts and their effectiveness] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence describing prior interventions.</p>

<h2>Tutkimus</h2> (Write everything below this sub-heading as a complete coherrent section with professional terminology.)
<p>[Physical examination findings] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence describing the clinical examination.</p>
<p>[Completed tests and their results] (only include completed tests with results that were explicitly mentioned during the visit). Please write this as a complete, professional sentence detailing diagnostic findings.</p>
<p>[Vital signs measurements] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence documenting vital parameters.</p>

<h2>Toimenpiteet</h2> (Write everything below this sub-heading as a complete coherrent section with professional terminology.)
<p>[Procedures and treatments performed during this visit] (only include procedures explicitly performed during the visit). Please write this as a complete, professional sentence describing all procedures performed.</p>
<p>[Details of any samples taken or diagnostic procedures completed] (only include if explicitly performed during the visit). Please write this as a complete, professional sentence.</p>

<h2>Diagnoosi</h2> (Write everything below this sub-heading as a complete coherrent section with professional terminology.)
<p>[Confirmed conditions or problems] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence stating the diagnosis.</p>
<p>[Possible differential diagnoses] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence listing considered conditions.</p>

<h2>Hoitosuunnitelma</h2> (Write everything below this sub-heading as a complete coherrent section with professional terminology.)
<p>[Planned further diagnostics] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence describing recommended diagnostics.</p>
<p>[Prescribed treatments and medications] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence detailing prescribed treatments.</p>
<p>[Follow-up visits and care instructions] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence outlining the follow-up plan.</p>
<p>[Discussed costs] (only include if explicitly mentioned during the visit). Please write this as a complete, professional sentence summarizing financial discussions.</p>

(Include only information explicitly mentioned during the visit. Write in complete, grammatically correct sentences using professional terminology. Do not add conclusions or recommendations not discussed during the visit. Maintain a formal, medical writing style throughout the document.)`;

export const initialTemplateFullSentencesTest = () => `<h2>Yleistiedot</h2> 
<p>[Patient identification and basic information].</p>
<p>[Reason for visit and observed symptoms].</p>
<p>[Duration, location and severity of symptoms].</p>
<p>[Previous treatment attempts and their effectiveness].</p>

<h2>Tutkimus</h2> 
<p>[Physical examination findings].</p>
<p>[Completed tests and their results].</p>
<p>[Vital signs measurements].</p>

<h2>Toimenpiteet</h2> 
<p>[Procedures and treatments performed during this visit].</p>
<p>[Details of any samples taken or diagnostic procedures completed].</p>

<h2>Diagnoosi</h2> 
<p>[Confirmed conditions or problems].</p>
<p>[Possible differential diagnoses].</p>

<h2>Hoitosuunnitelma</h2> 
<p>[Planned further diagnostics].</p>
<p>[Prescribed treatments and medications].</p>
<p>[Follow-up visits and care instructions].</p>
<p>[Discussed costs].</p>

(Include only information explicitly mentioned during the visit. Write in complete, grammatically correct sentences using professional terminology. Do not add conclusions or recommendations not discussed during the visit. Maintain a formal, medical writing style throughout the document.)`;

export const visitSummaryTemplate = () => `<h2>Käynnin yhteenveto</h2>
<p>[Complete summary of the veterinary visit, including all clinical observations, diagnostics, treatments, and recommendations. Maintain the natural flow of the transcription while excluding any content unrelated to the veterinary visit or patient care. Organize the information in a logical clinical sequence while preserving all medical details exactly as described.]</p>`;
