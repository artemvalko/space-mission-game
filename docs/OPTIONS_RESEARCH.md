# Real alternative options per step: data supplement (v1, 15 Nov 2026)

Supplements `docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md`. Every option below is a **real product, mission or service**, with a source URL. Codes O01–O40 continue the S01–S34 list.

Labels (same rules as the main research):
- **[FACT]**: an official or primary source (agency, manufacturer, operator).
- **[CATALOG]**: a public list price or spec for one product on the date checked. Listings sometimes disagree; when they do, both values are given.
- **[REPORTED]**: a figure from press or third-party listings, not from the vendor. Show it as "reported", never as official.
- **NOT PUBLIC**: no public number exists. The game must show "price/mass not public" and **must not invent one**.

---

## 1. Shared 6U/3U bus parts (used by COMMS and WEATHER)

### 1.1 Solar power (EnduroSat, all [CATALOG])
| id | Product | Power | Mass | Price | Trade-off | Source |
|---|---|---|---|---|---|---|
| `pwr_6u_fixed` | EnduroSat 6U Solar Panel (body-mounted) | up to **19.2 W** in LEO | **390 g** (newer page: 545 g) | **$16,200** (store) · $20,000 (research S09) | cheap, nothing to deploy, but half the power | O01, O02, S09 |
| `pwr_6u_deploy` | EnduroSat 6U Deployable Solar Array | up to **19.2 W per side** (2 sides ≈ 38.4 W) | **655–1065 g** | **$48,400** (store) · $51,300 (satsearch) · $59–88k (research S08) | double the power, but must unfold (one more thing that can fail) | O01, O03, S08 |
| `pwr_3u_deploy` | EnduroSat 3U Deployable Solar Array | **8.4 W per side** | — | $19,800–33,300 (store) | for a 3U build only | O01, O04 |
| `pwr_8u_deploy` | EnduroSat 8U Deployable Solar Array | up to **24.0 W per side** | 930–1035 g | $20,100–60,400 (store) | more power than a 6U needs; heavier | O01, O05 |

> Prices differ between listings and dates. The UI shows the store price and lists the other values in Details.

### 1.2 Battery + power board (EnduroSat EPS, 2022 catalog, [CATALOG])
| id | Product | Capacity | Mass (EPS + battery) | Trade-off |
|---|---|---|---|---|
| `bat_eps1` | EPS I | **10.2 Wh** | **208 g** | lightest. Usable at 60% DoD = 6.1 Wh, **not enough** for the comms eclipse need (8.75 Wh, research §3.3) → realistic failure |
| `bat_eps1plus` | EPS I+ | **20.4 Wh** | **298 g** | usable 12.2 Wh: **enough** for comms (8.75) and weather (9.92), with a thin margin |
| `bat_eps2` | EPS II | **84 Wh** | **1280 g** | huge margin and redundant buses, but ~1 kg more mass |

Source: O06 (EnduroSat Product Catalogue 02/22; historical, not a current price list). Prices: NOT PUBLIC in that catalog.
The research model values (60 Wh / 80 Wh) stay as an "≈ Estimate" option.

### 1.3 Control radio, TT&C ([CATALOG])
| id | Product | Rate | Mass | Power | Price | Source |
|---|---|---|---|---|---|---|
| `ttc_es_uhf2` | EnduroSat UHF Transceiver II | up to 19.2 kbps | **94 g** (product page) · 200 g (new "UHF Transceiver" on satsearch) | Tx 1 W (2 W option) | **$6,300** list (satsearch 2026) · $4,600 avg FY2021 (satcatalog) | O07, O08, O09 |
| `ttc_gom_ax100` | GomSpace NanoCom AX100 | VHF/UHF | **24.5 g** | — | NOT PUBLIC | S18 |
| `ttc_es_sband_trx` | EnduroSat S-Band Transceiver (full duplex) | 0.1–125 kbps | **246 g** | 1.2 W idle, **12 W max** | **$14,000** list | O10, O11 |

### 1.4 Data downlink ([CATALOG])
| id | Product | Max rate | Mass | Power | Needs | Source |
|---|---|---|---|---|---|---|
| `dl_es_sband_tx` | EnduroSat S-Band Transmitter | **20 Mbps** | **250 g** | Tx 0.5–2 W; avg 9 W (satcatalog) | S-band ground station | O12 |
| `dl_es_xband_tx` | EnduroSat X-Band Transmitter | **150 Mbps** | **396 g** | Tx 0.4–2 W | X-band ground station (pricier) | O13 |
| (reuse) `ttc_es_sband_trx` | S-Band Transceiver as downlink | 125 kbps | 246 g | 12 W max | enough for IoT bytes; too slow for big science data | O10 |

Teaching point: IoT messages are bytes, so 125 kbps is plenty and 150 Mbps X-band is overkill. A radiometer makes ~8 kbps (TEMPEST-D, O16), and even S-band is enough.

### 1.5 Pointing system, ADCS ([FACT], NASA SoA tables + vendor)
| id | Product | Mass | Pointing | Trade-off | Source |
|---|---|---|---|---|---|
| `adcs_cubespace_small` | CubeSpace CubeADCS 3-Axis Small | **0.55 kg** | ~0.1° class (see SoA table) | light and cheaper; enough for nadir pointing | O14 |
| `adcs_bct_xact15` | Blue Canyon XACT-15 | **0.885 kg** | **0.007°** | very precise (flew on MinXSS and ASTERIA); heavier than CubeSpace | O14, O15 |
| `adcs_bct_xact50` | Blue Canyon XACT-50 | **1.23 kg** | 0.007° | bigger wheels for heavier 6U/12U sats; overkill for a light 6U | O14, O15 |
Prices: NOT PUBLIC.

### 1.6 Ground stations
| id | Option | What is real | Price | Source |
|---|---|---|---|---|
| `gs_aws` | AWS Ground Station (rent antenna time) | [FACT] pay-per-minute, LEO **and MEO**, S-band up/down, X-band down | [REPORTED] ~$10–15/min narrowband, $22–25/min wideband (third-party listing; the official page says "pay per minute") | O17, O18 |
| `gs_ksat` | KSAT network | [FACT] used for TROPICS downlink | NOT PUBLIC | O19 |
| `gs_own_gateway` | Own gateway(s) (research model) | research §3.4 | ≈ Estimate $0.5M (research) | S-research |


### 1.7 CubeSat frame / structure (EnduroSat, [CATALOG])
| id | Product | Mass | Price (store) | Source |
|---|---|---|---|---|
| `str_es_3u` | EnduroSat 3U CubeSat Structure | **0.285 kg** (3U Structure II, satcatalog) | **$3,900–4,200** (avg $3,300–3,600 FY2021) | O46, O47 |
| `str_es_6u_xl` | EnduroSat 6U XL CubeSat Structure | NOT PUBLIC (research model 1.10 kg stays as ≈) | **$7,600** | O46 |
| `str_es_8u` | EnduroSat 8U CubeSat Structure | NOT PUBLIC | **$9,300** | O46 |
| `str_es_12u_xl` | EnduroSat 12U XL CubeSat Structure | **2.44 kg** incl. fasteners and 6 rings | **$13,000** | O46, O48 |
These fill the current "not in our data" gap for 3U and 12U.
Real "whole bus" references for Details: EnduroSat 3U platform $298,000, 6U XL $355,000, 12U XL $449,000. Bus masses: 3U 2.4–3.5 kg, 6U 4.2–4.8 kg, 12U 6–8 kg. Payload capacity: 6U 7.2–7.8 kg, 12U 14–16 kg (O46, O49).

### 1.8 On-board computer ([CATALOG])
| id | Product | Mass | Power | Price | Trade-off | Source |
|---|---|---|---|---|---|---|
| `obc_es_type1` | EnduroSat Onboard Computer Type I | **58 g** (satcatalog) · 130 g (2022 catalog) | **0.9 W** | NOT PUBLIC | light; storage on microSD | O50, O06 |
| `obc_es_gnss` | EnduroSat OBC **with GNSS** | **180 g** | — | NOT PUBLIC | built-in GNSS (20 ns time accuracy), 8 GB memory, rated up to 5 yr LEO → replaces the separate GNSS receiver card | O51 |
| `obc_isis_iobc` | ISISPACE iOBC | **94 g** (main board) | **0.4 W** | price on request | lowest power; flight heritage since 2012 | O52, O53 |
| `obc_si_quad` | Space Inventor OBC (4 independent computers) | **160 g** | — | **€9,000** MSRP | built-in redundancy (4 cores) | O54 |

### 1.9 End-of-life / deorbit choice (CubeSats in LEO)
| id | Option | Real basis | Numbers |
|---|---|---|---|
| `eol_natural_decay` | Natural drag decay (do nothing) | NASA SoA: small sats at low altitude can rely on drag; higher orbits decay much slower | qualitative; NASA's example is a 6U, 0.06 m², 14 kg CubeSat decay curve (O55) |
| `eol_drag_sail` | Drag sail | NASA SoA: passive drag sails help meet the **5-year** post-mission rule; real flights include CanX-7 (5 m²) and RemoveDEBRIS (0.35 m²) (O55, O56) | product masses/prices NOT PUBLIC → show "?" |
| `eol_attitude_drag` | Turn the satellite broadside with the ADCS to raise drag | NASA SoA lists this as a real technique at low altitude (O55) | needs an ADCS; no extra hardware |
Teaching use: for `leo_550`/`sso_550_650`, the Launch prep "disposal plan" item becomes a real choice. Higher orbits warn that natural decay may not meet the 5-year rule (FCC, research S22).

---

## 2. COMMS mission: real alternatives

### 2.1 Satellite size / architecture: four real answers to the same problem
| id | Real example | Size / mass | Orbit | What it teaches | Source |
|---|---|---|---|---|---|
| `arch_swarm_025u` | **Swarm SpaceBEE** | **0.25U, 11×11×2.8 cm, ~400 g** (tracking DB: 0.284 kg) | ~500 km | tiny and cheap, but Swarm planned **~150 sats** to get coverage; the FCC refused its first licence in 2017 because sats that small are hard to track → **debris/licensing lesson** | O20, O21, O22 |
| `arch_astrocast_3u` | **Astrocast** | **3U, ~4.5 kg** | polar LEO (~97.6°) | licensed **L-band** spectrum; full constellation planned 64 sats; low-power ground module (<0.35 W peak Tx) | O23, O24, O25 |
| `arch_sateliot_6u` | **Sateliot (Alén Space)** | **6U, 10 kg** | SSO 500–600 km | standard **5G NB-IoT** phones/modules; 5-yr design life | S31 |
| `arch_research_6u` | Research model build | 6U, 8.68 kg | LEO 550 km | the main research path | research §3 |

### 2.2 Mission payload: IoT radio "language"
| id | Option | Real example | Trade-off |
|---|---|---|---|
| `iot_lora` | LoRa / LoRaWAN space gateway | **Lacuna Space** (store-and-forward; very sensitive receiver; works with standard LoRa sensors) [FACT, O26, O27] | cheap ground devices; mass/price NOT PUBLIC |
| `iot_lband` | L-band licensed IoT | **Astrocast** [FACT, O24] | protected licensed spectrum, tiny antennas; spectrum access via a partner |
| `iot_nbiot_ntn` | 5G NB-IoT NTN | **Sateliot** [FACT, S31] | works with standard cellular IoT chips; newest standard |
| `iot_sdr_model` | Generic IoT SDR (research model) | research §3.2 | ≈ Estimate mass/price |

Payload masses and prices for Lacuna/Astrocast/Sateliot: NOT PUBLIC. Use the research SDR model numbers only for `iot_sdr_model`. For the other three, show "≈ same class as the research SDR (estimate)", or show "not public" and treat cost as uncertain (see §5).

### 2.3 Launch
| id | Option | Data | Source |
|---|---|---|---|
| `lv_f9_rideshare` | Falcon 9 rideshare | $350k per 50 kg to SSO, +$7k/kg | S11 |
| `lv_electron` | Electron dedicated | [REPORTED] **~$7.5M** list (several outlets; up to ~$8.4M in a 2026 analyst estimate); 300 kg LEO / 200 kg SSO | S13, O28, O29 |
| `lv_iss_deploy` | Deploy from the ISS (NanoRacks / NASA CSLI) | [FACT] TEMPEST-D and RainCube were deployed from the ISS on 13 Jul 2018 into **~400 km, 51.6°**. Low orbit = shorter life, no polar coverage | O16, O30 |

Electron vs rideshare is a real lesson: per kg, a dedicated launch costs several times more, but you choose your own orbit and date.

---

## 3. WEATHER mission: real alternatives

### 3.1 Mission payload: four real instruments
| id | Instrument (real mission) | Measures | Mass | Power | Data | Volume | Status | Source |
|---|---|---|---|---|---|---|---|---|
| `wx_tempestd_radiometer` | **TEMPEST-D** passive mm-wave radiometer, 5 ch **89–182 GHz** | humidity, cloud ice, onset of rain; sees through clouds | **1.6 kg** (best estimate; allocation 3 kg) | **3.8 W** | **8 kbps** | ~4U in 6U | flew 2018–2021, TRL 7+ | O16, O31, S07 |
| `wx_tropics_radiometer` | **TROPICS** 12 ch **90–205 GHz** radiometer | temperature + humidity profiles, precipitation | payload in **1U**; whole sat **5.4 kg** | payload **~3 W** (<5 W); sat 15 W | — | 1U payload + 2U bus = **3U** | 4 sats operating since May 2023 | O32, O33, O34 |
| `wx_raincube_radar` | **RainCube** Ka-band **35.75 GHz** precipitation radar | vertical **rain profile** inside storms | radar **7 kg** (vs 336 kg for GPM's KaPR) | **22 W** transmit | — | radar 3U + 0.5 m antenna stowed in **1.5U**; sat **12 kg** 6U | first radar on a CubeSat, 2018 | O30, O35, O36 |
| `wx_gnss_ro` | **Spire** GNSS radio-occultation receiver (STRATOS) | temperature/humidity profiles from the bending of GPS signals; **needs no calibration** | NOT PUBLIC | NOT PUBLIC | — | flies on **3U** | operational; NOAA buys the data | O37, O38 |
| `wx_ciras_ir` | **CIRAS** IR sounder (JPL) | IR temperature/water-vapour profile | — | needs a **cryocooler** | — | 6U | **cancelled**: an honest "too hard for now" card | O39 |
| `wx_rgb_camera` | ordinary camera (distractor) | cloud tops only | — | — | — | — | — | research §5.6 |

Real trade-offs to surface:
- **Radar vs radiometer:** the radar measures rain **directly**, but needs ~6× the radiometer's power. RainCube lost one of its two power trackers in orbit and after that could only run the radar ~40 min at a time (O36). Show it as a real "power margin matters" lesson.
- **TROPICS-type vs TEMPEST-D-type:** TROPICS is more channels in a smaller box (3U) but spins at 30 rpm. TEMPEST-D has fewer channels in a 6U, with more power and space margin.
- **GNSS-RO:** tiny and needs no calibration, but gives sparse profiles, not images. Pairs well with a constellation.
- Prices: all NOT PUBLIC → see §5. The research's $4.0M radiometer model value applies to `wx_tempestd_radiometer` only (badge it as an estimate).

### 3.2 Size
| id | Real example | Mass |
|---|---|---|
| 3U | TROPICS | 5.34–5.4 kg [FACT, O32] |
| 6U | TEMPEST-D | ~12–14 kg class (eoPortal slew spec "14 kg, 6U") [FACT, O31]; RainCube **12 kg** [O30] |
CubeSat spec limits from S01 (3U 6 kg, 6U 12 kg) still apply. Note that RainCube was at the 12 kg 6U limit.

### 3.3 Orbit: three real choices
| id | Orbit | Real mission | Trade-off |
|---|---|---|---|
| `orb_sso_550_650` | SSO 550–650 km | research model; TROPICS **Pathfinder** used SSO (2 pm) | same local time every day; global coverage |
| `orb_leo_550_32deg` | 550 km, **32–33°** | **TROPICS** constellation | revisits **tropical cyclones** often; no polar coverage |
| `orb_iss_400_516` | ~400 km, 51.6° | **TEMPEST-D, RainCube** (ISS deploy) | easiest ride; lower orbit decays sooner |

### 3.4 Launch
- Falcon 9 rideshare (S11), **Electron** (TROPICS launched on Electron, May 2023 [FACT, O34]), ISS deployment (O16).
- **Real risk story:** the first two TROPICS sats were lost on 12 Jun 2022, when the Astra Rocket 3.3 upper stage shut down early [FACT, O34]. Use it as a simulated-event caption ("this really happened to TROPICS"). Do not convert it into a probability.

### 3.5 Ground
KSAT (TROPICS used KSAT downlink; data latency 45 min [FACT, O33]), AWS Ground Station, own station.

---

## 4. NAVIGATION mission: real alternatives

### 4.1 Satellite platform
| id | Real satellite | Launch mass | Clocks | Orbit | Design life | Source |
|---|---|---|---|---|---|---|
| `nav_galileo_foc` | **Galileo FOC** (OHB/SSTL) | ~700–733 kg | **2 PHM + 2 rubidium** | MEO 23,222 km, 56° | >12 yr | S04, S05 |
| `nav_gps_iii` | **GPS III** (Lockheed Martin) | **8,115 lb ≈ 3,681 kg** (on-orbit 4,764 lb) | **3 rubidium** | MEO ~20,200 km (10,898 nmi), **55°**, 6 planes | **15 yr** design, 12 yr mean | O40 |
| `nav_celeste_leo` | **ESA Celeste IOD** (info / stretch) | 12U 20 kg / 16U 30 kg | no atomic clock in IOD-1 | LEO 500–600 km | — | S32–S34 |

Trade-off: GPS III is ~5× heavier, with a longer life and more signals. Galileo is lighter, and 2 fit on one Falcon 9 or Ariane 6.

### 4.2 Clock options (the core decision)
| id | Option | Real use | Note |
|---|---|---|---|
| `clk_phm_rafs_4` | 2 passive hydrogen masers + 2 rubidium | Galileo | most stable; heavier |
| `clk_rafs_3` | 3 rubidium (RAFS) | GPS III | proven, simpler |
| `clk_drafs_demo` | digital rubidium (DRAFS), **technology demo** | first flown on GPS III SV10 (launched 21 Apr 2026) as an add-on to the standard clocks | "new tech" risk card; not a replacement yet |
| `clk_none_leo` | no atomic clock | Celeste IOD (LEO only) | valid **only** for the LEO-PNT demo path |
Clock masses and prices: NOT PUBLIC.

### 4.3 Launch: three real ways Galileo actually flew
| id | Option | Real event | Price |
|---|---|---|---|
| `lv_f9_galileo` | Falcon 9, **2 sats per launch** | Galileo **L12 (28 Apr 2024)** and **L13 (17 Sep 2024)**. On L12 the booster was expended to reach the needed orbit | [REPORTED] EC paid **€180M for the 2 launches** (Politico via Spaceflight Now) |
| `lv_ariane62_galileo` | **Ariane 6 (Ariane 62)**, 2 sats | Galileo **L14, 17 Dec 2025**, first Galileo flight on Ariane 6; separation 3 h 55 min after liftoff | NOT PUBLIC |
| `lv_electron` | Electron | NO-GO: 300 kg LEO max | — |
| `lv_falcon_heavy` | Falcon Heavy | overkill | S21 |
Sources: O41, O42, O43, O44.

Teaching point: two satellites per launch halves the launch cost per satellite, a real reason Galileo flies in pairs. Optional toggle: "Launch 1 or 2 satellites".

### 4.4 Extra real option
`nav_lra`: **Laser retroreflector array.** Flown on GPS III SV09 and SV10, it lets NASA measure the satellite's distance to under 1 cm (O45). Real benefit: better orbit knowledge. Mass and price: NOT PUBLIC.

---

## 5. Rule for options whose price or mass is NOT PUBLIC
1. The card shows the real facts plus "💰 price not public" (and ⚖️ the same if mass is unknown).
2. The game **does not invent** a number. The Money gauge shows a hatched "uncertain" segment and the label "Budget: uncertain (1 part has no public price)". This is amber, not red.
3. Scoring: cost efficiency is computed from known items only, and the results show "Real engineers would request a quote (RFQ) here". No penalty and no bonus.
4. If an option's **mass** is unknown, the mass hard gate becomes "cannot verify", which is a **NO-GO for flight**, unless a real whole-satellite mass exists (e.g. TROPICS 5.4 kg). In that case, offer a "use the real satellite's total mass" path where the player picks a **complete reference build** instead of individual parts.

---

## 6. Sources (O-codes)
| Code | URL |
|---|---|
| O01 | https://www.endurosat.com/cubesat-store/page/4/ (store prices) and https://endurosat.com/products-category/antennas/ |
| O02 | https://www.endurosat.com/products/6u-solar-panel/ |
| O03 | https://satsearch.co/products/endurosat-6u-deployable-solar-array |
| O04 | https://www.endurosat.com/products/3u-deployable-solar-array |
| O05 | https://www.endurosat.com/products/8u-solar-panel/ |
| O06 | https://endurosat.com/wp-content/uploads/2022/02/Endurosat_Product_Catalogue_02_22.pdf |
| O07 | https://endurosat.com/products/uhf-transceiver-ii |
| O08 | https://satsearch.co/products/endurosat-uhf-transceiver-ii |
| O09 | https://www.satcatalog.com/component/uhf-transceiver-ii/ |
| O10 | https://endurosat.com/products/s-band-transceiver |
| O11 | https://satsearch.co/products/endurosat-s-band-receiver |
| O12 | https://endurosat.com/products/s-band-transmitter and https://www.satcatalog.com/component/s-band-transmitter/ |
| O13 | https://endurosat.com/products/x-band-transmitter/ |
| O14 | https://www.nasa.gov/wp-content/uploads/2021/10/5.soa_gnc_2021.pdf |
| O15 | https://www.bluecanyontech.com/?p=4112 |
| O16 | https://eoportal.org/satellite-missions/tempest-d |
| O17 | https://aws.amazon.com/ground-station/pricing/ and https://aws.amazon.com/ground-station/features/ |
| O18 | https://spacenexus.us/marketplace/listings/aws-ground-station-as-a-service-mlh3vvjv ([REPORTED]) |
| O19 | https://gestar2.umbc.edu/wp-content/uploads/sites/674/2023/11/Blackwell_TROPICS_CREWSR_NASA_GESTAR_26Sep2023.pdf |
| O20 | https://www.ispreview.co.uk/index.php/2021/08/spacex-and-starlink-branch-out-into-tiny-internet-pico-satellites.html |
| O21 | https://cavac.at/cavacopedia/Swarm%20Technologies (FCC 2017 refusal, 0.25U, 400 g) |
| O22 | https://keeptrack.space/satellite/48890 |
| O23 | https://space.skyrocket.de/doc_sdat/astrocast-0101.htm and https://keeptrack.space/satellite/54370 |
| O24 | https://www.astrocast.com/technology |
| O25 | https://soracom.io/partners/astrocast/ |
| O26 | https://connectivity.esa.int/?p=18243 |
| O27 | https://www.eoportal.org/satellite-missions/lacuna-constellation |
| O28 | https://spacenexus.us/guide/cost-to-launch/dedicated-electron-mission ([REPORTED]) |
| O29 | https://orbitalradar.com/launch-vehicles/electron ([REPORTED]) |
| O30 | https://space.skyrocket.de/doc%5Fsdat/raincube.htm |
| O31 | https://esto.nasa.gov/forums/estf2016/PRESENTATIONS/Reising_A1P4_TEMPEST_ESTF2016.pdf |
| O32 | https://en.wikipedia.org/wiki/TROPICS_(spacecraft_constellation) |
| O33 | https://gestar2.umbc.edu/wp-content/uploads/sites/674/2023/11/Blackwell_TROPICS_CREWSR_NASA_GESTAR_26Sep2023.pdf |
| O34 | https://eospso.nasa.gov/missions/time-resolved-observations-precipitation-structure-and-storm-intensity-constellation |
| O35 | https://www.ieee-bv.org/wp-content/uploads/2020/09/RainCube_IEEE_MTTS_Chapter_4-21-2020.pdf |
| O36 | https://esto.nasa.gov/wp-content/uploads/2020/07/Joshi-RainCube.pdf |
| O37 | https://ams.confex.com/ams/98Annual/webprogram/Paper333324.html |
| O38 | https://repository.library.noaa.gov/view/noaa/58772 |
| O39 | https://www.nanosats.eu/sat/ciras |
| O40 | https://www.losangeles.spaceforce.mil/About-Us/Fact-Sheets/Display/Article/343728/gps-iii/ |
| O41 | https://esa.int/Applications/Satellite_navigation/Two_new_satellites_join_the_Galileo_constellation2 |
| O42 | https://spaceflightnow.com/?p=66030 (€180M for two launches, [REPORTED]) |
| O43 | https://defence-industry-space.ec.europa.eu/successful-launch-two-new-galileo-satellites-2024-09-18_en |
| O44 | https://www.esa.int/Applications/Satellite_navigation/Galileo_s_first_Ariane_6_launch_strengthens_European_resilience |
| O45 | https://lockheedmartin.com/en-us/news/features/2026/From-a-Rocket-to-Your-Pocket-Behind-the-GPS-III-Evolution.html |
| O46 | https://endurosat.com/cubesat-store/page/4/ (structures + platforms store prices) |
| O47 | https://www.satcatalog.com/component/3u-cubesat-structure-ii/ |
| O48 | https://satsearch.co/products/endurosat-12u-cubesat-structure |
| O49 | https://www.endurosat.com/products/1u-platform (bus/payload mass table) |
| O50 | https://www.satcatalog.com/component/onboard-computer-type-i/ |
| O51 | https://endurosat.com/products/onboard-computer-with-gnss |
| O52 | https://www.satnow.com/products/on-board-computers/isispace/116-1233-iobc |
| O53 | https://isispace.nl/?p=2263 |
| O54 | https://space-inventor.com/modules/subsystems/guidance-navigation-control/on-board-computer |
| O55 | https://nasa.gov/wp-content/uploads/2023/05/13.-soa-deorbit-2022.pdf |
| O56 | https://arxiv.org/html/2408.13562v1 |
