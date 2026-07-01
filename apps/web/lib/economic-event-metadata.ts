export interface EventMetadata {
  source: string;
  measures: string;
  usualEffect: string;
  frequency: string;
  releaseSchedule: string;
  ffNotes: string;
  whyTradersCare: string;
  derivedVia: string;
  acroExpand: string;
  tradingImpact: {
    volatility: number; // 1-5
    typicalMovement: string;
  };
}

interface RegistryEntry {
  key: string;
  aliases: string[];
  metadata: EventMetadata;
}

const REGISTRY: RegistryEntry[] = [
  // =========================
  // Inflation
  // =========================

  {
    key: "core cpi m/m",
    aliases: [
      "core cpi mom",
      "core cpi m/m",
      "core cpi",
      "cpi core",
      "core consumer price index",
    ],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the price of goods and services purchased by consumers, excluding food and energy",
      usualEffect:
        "'Actual' greater than 'Forecast' is good for currency (short-term); high inflation can lead to hawkish central bank policy",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, about 16 days after the month ends (usually the second week of the following month)",
      ffNotes:
        "Core CPI excludes volatile food and energy components. The Fed focuses on this measure to gauge underlying inflation trends. The unadjusted 'CPI' release is reported at the same time.",
      whyTradersCare:
        "Consumer prices account for a majority of overall inflation. Inflation is important to currency valuation because rising prices lead the central bank to raise interest rates out of respect for their inflation containment mandate",
      derivedVia:
        "Survey of approximately 23,000 retail and service establishments, plus data on rents from about 50,000 landlords and tenants",
      acroExpand: "Consumer Price Index (ex Food & Energy)",
      tradingImpact: {
        volatility: 5,
        typicalMovement: "20-40 pips",
      },
    },
  },
  {
    key: "cpi m/m",
    aliases: ["cpi mom", "cpi m/m", "cpi", "consumer price index", "cpi y/y"],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the price of goods and services purchased by consumers",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 16 days after the month ends",
      ffNotes:
        "The CPI is released alongside Core CPI. The headline number includes food and energy prices, making it more volatile than the core reading.",
      whyTradersCare:
        "Consumer prices account for a majority of overall inflation. Rising prices may lead the central bank to raise rates",
      derivedVia:
        "Survey of approximately 23,000 retail and service establishments, plus data on rents",
      acroExpand: "Consumer Price Index",
      tradingImpact: {
        volatility: 5,
        typicalMovement: "20-40 pips",
      },
    },
  },
  {
    key: "ppi m/m",
    aliases: ["ppi mom", "ppi m/m", "ppi", "producer price index"],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the price of goods sold by manufacturers and producers",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 13 days after the month ends",
      ffNotes:
        "PPI measures price changes from the perspective of the seller. PPI is considered a leading indicator of consumer inflation — when producers charge more, the higher costs are usually passed on to consumers.",
      whyTradersCare:
        "It's a leading indicator of consumer inflation. Changes in producer-level prices are typically passed through to consumers",
      derivedVia:
        "Survey of approximately 10,000 businesses across manufacturing, mining, and services sectors",
      acroExpand: "Producer Price Index",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },
  {
    key: "core ppi m/m",
    aliases: [
      "core ppi mom",
      "core ppi m/m",
      "core ppi",
      "ppi core",
      "core producer price index",
    ],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the price of goods sold by producers, excluding food and energy",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 13 days after the month ends",
      ffNotes:
        "Core PPI excludes food and energy for a less volatile reading. Released simultaneously with headline PPI.",
      whyTradersCare:
        "Provides insight into underlying producer-level inflation trends without food and energy volatility",
      derivedVia:
        "Survey of approximately 10,000 businesses in manufacturing, mining, and services",
      acroExpand: "Producer Price Index (ex Food & Energy)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },

  // =========================
  // Employment
  // =========================

  {
    key: "non farm employment change",
    aliases: [
      "non farm employment change",
      "nonfarm payrolls",
      "non farm payrolls",
      "nfp",
      "non-farm employment change",
      "non farm payroll",
    ],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the number of employed people during the previous month, excluding the farming industry",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, first Friday after the month ends",
      ffNotes:
        "This is the headline number from the Employment Situation report, which also includes the Unemployment Rate and Average Hourly Earnings. NFP is typically the most anticipated economic release each month. Large revisions to the prior month's figure are common.",
      whyTradersCare:
        "Job creation is an important leading indicator of consumer spending, which accounts for a majority of overall economic activity",
      derivedVia:
        "Survey of approximately 144,000 businesses and government agencies representing about 697,000 individual worksites",
      acroExpand: "Non-Farm Payrolls",
      tradingImpact: {
        volatility: 5,
        typicalMovement: "50-120 pips (USD pairs)",
      },
    },
  },
  {
    key: "adp non farm employment change",
    aliases: [
      "adp non farm employment change",
      "adp employment change",
      "adp nfp",
      "adp payrolls",
      "adp nonfarm",
    ],
    metadata: {
      source: "ADP Research Institute (latest release)",
      measures:
        "Change in the number of employed people during the previous month, based on ADP payroll data",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, two days before the BLS Employment Situation report (usually Wednesday before NFP Friday)",
      ffNotes:
        "The ADP report is widely viewed as a preview of the government's NFP release, though the two can diverge significantly. ADP uses anonymized payroll data from its client base of approximately 25 million US workers.",
      whyTradersCare:
        "It's an early indicator of employment trends and often sets expectations for the official NFP report two days later",
      derivedVia:
        "Aggregated, anonymized payroll data from ADP clients covering roughly 25 million private-sector workers",
      acroExpand: "Automatic Data Processing (ADP) National Employment Report",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-30 pips",
      },
    },
  },
  {
    key: "unemployment rate",
    aliases: ["unemployment rate", "jobless rate"],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Percentage of the total work force that is unemployed and actively seeking employment",
      usualEffect: "'Actual' less than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, first Friday after the month ends",
      ffNotes:
        "Released as part of the Employment Situation report alongside NFP and Average Hourly Earnings. The Unemployment Rate comes from a separate household survey (not the establishment survey that produces NFP).",
      whyTradersCare:
        "It's a key measure of labor market slack. Low unemployment can signal upward wage pressure and inflation risk",
      derivedVia:
        "Survey of approximately 60,000 households (the Current Population Survey)",
      acroExpand: "Unemployment Rate (U-3 measure)",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "15-25 pips",
      },
    },
  },
  {
    key: "average hourly earnings m/m",
    aliases: [
      "average hourly earnings mom",
      "average hourly earnings m/m",
      "average hourly earnings",
      "avg hourly earnings",
    ],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Change in the average hourly earnings of all private nonfarm employees",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, first Friday after the month ends",
      ffNotes:
        "Released as part of the Employment Situation report. This is a key inflation indicator because wage growth can feed into broader price increases. The Fed watches this closely.",
      whyTradersCare:
        "It's a leading indicator of consumer inflation. When businesses pay more for labor, the higher costs are usually passed on to consumers",
      derivedVia:
        "Survey of approximately 144,000 businesses and government agencies",
      acroExpand: "Average Hourly Earnings",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-25 pips",
      },
    },
  },
  {
    key: "employment change",
    aliases: [
      "employment change",
      "net change in employment",
      "net employment change",
    ],
    metadata: {
      source:
        "Statistics Canada / Australian Bureau of Statistics (varies by country)",
      measures:
        "Change in the number of employed people during the previous month",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, varies by country",
      ffNotes:
        "This is the headline employment figure for non-US economies (Canada, Australia, New Zealand). Release timing and methodology vary. Canada reports alongside its Unemployment Rate in the Labour Force Survey.",
      whyTradersCare:
        "Job creation is a leading indicator of consumer spending and overall economic health",
      derivedVia: "National labor force surveys of households and businesses",
      acroExpand: "Employment Change (Net Change in Employment)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-30 pips",
      },
    },
  },
  {
    key: "initial jobless claims",
    aliases: [
      "initial jobless claims",
      "unemployment claims",
      "jobless claims",
      "weekly jobless claims",
    ],
    metadata: {
      source: "Department of Labor (latest release)",
      measures:
        "Number of individuals who filed for unemployment insurance for the first time during the past week",
      usualEffect: "'Actual' less than 'Forecast' is good for currency",
      frequency: "Weekly",
      releaseSchedule: "Weekly, every Thursday at 8:30 AM ET",
      ffNotes:
        "This is the timeliest US economic data. A higher-than-expected reading signals weakness in the labor market. The 4-week moving average is watched to smooth week-to-week volatility.",
      whyTradersCare:
        "It's the earliest and most timely indicator of US economic health. Trends in claims reflect changes in the labor market in near real-time",
      derivedVia:
        "State unemployment insurance agencies report the number of initial claims filed each week",
      acroExpand:
        "Initial Jobless Claims (Initial Claims for Unemployment Insurance)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },
  {
    key: "jolts job openings",
    aliases: ["jolts job openings", "jolts", "job openings", "jolts jobs"],
    metadata: {
      source: "Bureau of Labor Statistics (latest release)",
      measures:
        "Number of job openings during the reported month, excluding the farming industry",
      usualEffect:
        "'Actual' greater than 'Forecast' is good for currency for the jobs data; however, it is a lagging indicator",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 35 days after the month ends",
      ffNotes:
        "JOLTS stands for Job Openings and Labor Turnover Survey. The report also includes hires, quits, and layoffs data. The Fed watches the quits rate — rising quits signal worker confidence. Data is about one month behind other employment releases.",
      whyTradersCare:
        "It's a measure of labor demand. High job openings signal a tight labor market, which can lead to wage growth and inflationary pressure",
      derivedVia: "Survey of approximately 16,000 business establishments",
      acroExpand: "Job Openings and Labor Turnover Survey",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },

  // =========================
  // GDP & Growth
  // =========================

  {
    key: "gdp q/q",
    aliases: [
      "gdp qoq",
      "gdp q/q",
      "gdp",
      "gross domestic product",
      "gdp advance",
      "gdp preliminary",
      "gdp final",
      "gdp annualized",
    ],
    metadata: {
      source: "Bureau of Economic Analysis (latest release)",
      measures:
        "Change in the inflation-adjusted value of all goods and services produced by the economy",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Quarterly",
      releaseSchedule:
        "Quarterly, three estimates released: Advance (~1 month after quarter-end), Preliminary (~2 months after), and Final (~3 months after)",
      ffNotes:
        "GDP is released in three versions: Advance (first estimate), Preliminary (second), and Final (third). The Final version also includes corporate profits. The Advance release tends to have the most market impact. Revisions are common and can be significant.",
      whyTradersCare:
        "It's the broadest measure of economic activity and the primary gauge of the economy's health",
      derivedVia:
        "Aggregation of data from BEA surveys, Census Bureau reports, and other government agencies. The Advance release is based on incomplete source data and subject to substantial revision",
      acroExpand: "Gross Domestic Product",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "30-60 pips",
      },
    },
  },
  {
    key: "gdp m/m",
    aliases: ["gdp mom", "gdp m/m", "gdp monthly", "monthly gdp"],
    metadata: {
      source:
        "Statistics Canada / Office for National Statistics (varies by country)",
      measures:
        "Change in the inflation-adjusted value of all goods and services produced by the economy on a monthly basis",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about two months after the reference month",
      ffNotes:
        "Monthly GDP is reported by several non-US economies (Canada, UK). It provides a more frequent read on economic growth than quarterly GDP.",
      whyTradersCare:
        "It's the broadest measure of economic activity available at a monthly frequency",
      derivedVia:
        "Aggregation of output data from national statistical agencies",
      acroExpand: "Gross Domestic Product (Monthly)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-25 pips",
      },
    },
  },
  {
    key: "retail sales m/m",
    aliases: [
      "retail sales mom",
      "retail sales m/m",
      "retail sales",
      "advance retail sales",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures: "Change in the total value of sales at the retail level",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 14 days after the month ends",
      ffNotes:
        "Retail Sales is released as Advance Retail Sales about two weeks after month-end. It measures consumer spending at retail and food service establishments. It does not include services spending (which is a larger share of the economy). Strong retail sales signal healthy consumer demand.",
      whyTradersCare:
        "It's the primary gauge of consumer spending, which accounts for the majority of overall economic activity",
      derivedVia:
        "Survey of approximately 5,500 retail and food services firms",
      acroExpand:
        "Retail Sales (Advance Monthly Sales for Retail and Food Services)",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "15-30 pips",
      },
    },
  },
  {
    key: "core retail sales m/m",
    aliases: [
      "core retail sales mom",
      "core retail sales m/m",
      "core retail sales",
      "retail sales ex autos",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Change in the total value of sales at the retail level, excluding automobiles",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 14 days after the month ends",
      ffNotes:
        "Core Retail Sales excludes automobiles (the most volatile component) to provide a cleaner read on underlying consumer spending trends. Released alongside headline Retail Sales.",
      whyTradersCare:
        "Provides a less volatile reading of consumer spending than the headline figure",
      derivedVia:
        "Survey of approximately 5,500 retail and food services firms, excluding auto dealerships",
      acroExpand: "Core Retail Sales (Retail Sales ex Autos)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },
  {
    key: "durable goods orders m/m",
    aliases: [
      "durable goods orders mom",
      "durable goods orders m/m",
      "durable goods orders",
      "durable goods",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Change in the total value of new orders for goods that are expected to last more than three years",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 26 days after the month ends",
      ffNotes:
        "Durable goods are products designed to last at least three years (aircraft, machinery, electronics, etc.). The headline is volatile because of large commercial aircraft orders. Core Durable Goods Orders (ex-transportation) is a cleaner read on business investment.",
      whyTradersCare:
        "Rising durable goods orders signal that manufacturers will increase activity to fill the orders, and that businesses are confident enough to make large capital investments",
      derivedVia:
        "Survey of approximately 5,000 companies in the manufacturing sector",
      acroExpand: "Durable Goods Orders",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-25 pips",
      },
    },
  },
  {
    key: "core durable goods orders m/m",
    aliases: [
      "core durable goods orders mom",
      "core durable goods orders m/m",
      "core durable goods",
      "durable goods ex transportation",
      "durable goods ex transport",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Change in the total value of new orders for durable goods, excluding transportation items",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 26 days after the month ends",
      ffNotes:
        "Excludes transportation equipment (primarily commercial aircraft orders) to provide a less volatile reading of underlying business investment trends.",
      whyTradersCare:
        "Strips out the most volatile component (aircraft orders) to reveal the underlying trend in business capital spending",
      derivedVia:
        "Survey of approximately 5,000 manufacturers, excluding transportation equipment makers",
      acroExpand: "Core Durable Goods Orders (ex Transportation)",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },
  {
    key: "factory orders m/m",
    aliases: ["factory orders mom", "factory orders m/m", "factory orders"],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Change in the total value of new orders, shipments, and unfilled orders at manufacturing establishments",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 35 days after the month ends",
      ffNotes:
        "Factory Orders is a comprehensive report covering durable and nondurable goods. Durable goods data is known from the earlier Durable Goods Orders release, so the new information in this report relates to nondurable goods and revisions to durable goods.",
      whyTradersCare:
        "It's a broad indicator of manufacturing sector health and future production activity",
      derivedVia: "Survey of approximately 4,700 manufacturing establishments",
      acroExpand:
        "Manufacturers Shipments, Inventories, and Orders (Factory Orders)",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "10-20 pips",
      },
    },
  },

  // =========================
  // Manufacturing & Services
  // =========================

  {
    key: "ism manufacturing pmi",
    aliases: [
      "ism manufacturing pmi",
      "ism manufacturing",
      "ism manufacturing flash",
      "ism manufacturing final",
    ],
    metadata: {
      source: "Institute for Supply Management (latest release)",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the manufacturing industry",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, on the first business day after the month ends",
      ffNotes:
        "Above 50.0 indicates industry expansion, below indicates contraction. The ISM Manufacturing PMI is one of the most closely watched US economic indicators. It's a composite index weighted from five sub-indices: New Orders (30%), Production (25%), Employment (20%), Supplier Deliveries (15%), and Inventories (10%). Readings above 42.5 typically indicate overall economic expansion.",
      whyTradersCare:
        "It's a leading indicator of economic health. Businesses react quickly to market conditions, and purchasing managers hold the most current insight into the company's view of the economy",
      derivedVia:
        "Survey of about 400 purchasing managers which asks respondents to rate the relative level of business conditions including employment, production, new orders, prices, supplier deliveries, and inventories",
      acroExpand:
        "Institute for Supply Management Manufacturing Purchasing Managers' Index",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "15-30 pips",
      },
    },
  },
  {
    key: "ism services pmi",
    aliases: [
      "ism services pmi",
      "ism services",
      "ism non manufacturing",
      "ism services flash",
      "ism services final",
      "ism non manufacturing pmi",
    ],
    metadata: {
      source: "Institute for Supply Management (latest release)",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the services sector",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, on the third business day after the month ends",
      ffNotes:
        "Above 50.0 indicates industry expansion. The ISM Services PMI covers a much larger share of the US economy than manufacturing (about 80% of GDP). It was formerly called the Non-Manufacturing PMI.",
      whyTradersCare:
        "It covers the services sector, which accounts for the vast majority of US economic output. It's a leading indicator of economic health",
      derivedVia:
        "Survey of about 375 purchasing and supply executives across 17 services industries",
      acroExpand:
        "Institute for Supply Management Services Purchasing Managers' Index",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-25 pips",
      },
    },
  },
  {
    key: "manufacturing pmi",
    aliases: [
      "manufacturing pmi",
      "manufacturing pmi flash",
      "manufacturing pmi final",
      "flash manufacturing pmi",
    ],
    metadata: {
      source: "S&P Global (latest release)",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the manufacturing industry",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, Flash PMI is released about three weeks into the reference month; Final PMI is released at the beginning of the following month",
      ffNotes:
        "Above 50.0 indicates industry expansion, below indicates contraction. The S&P Global PMI is the non-US equivalent to ISM. There are two versions — Flash (earliest, most market impact) and Final. Flash is based on ~85% of survey responses; Final provides the complete picture.",
      whyTradersCare:
        "It's a leading indicator of economic health. Businesses react quickly to market conditions, and purchasing managers hold current insights into the economy",
      derivedVia:
        "Survey of purchasing managers in the manufacturing sector, covering areas including output, new orders, employment, and prices",
      acroExpand: "S&P Global Manufacturing Purchasing Managers' Index",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-25 pips",
      },
    },
  },
  {
    key: "services pmi",
    aliases: [
      "services pmi",
      "services pmi flash",
      "services pmi final",
      "flash services pmi",
    ],
    metadata: {
      source: "S&P Global (latest release)",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the services sector",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, Flash PMI is released about three weeks into the reference month; Final PMI is released at the beginning of the following month",
      ffNotes:
        "Above 50.0 indicates sector expansion. S&P Global Services PMI covers sectors like financial services, consumer services, and technology. Released alongside Manufacturing PMI in the Composite PMI release.",
      whyTradersCare:
        "Services represent the largest sector of most developed economies. It's a leading indicator of economic health",
      derivedVia: "Survey of purchasing managers in the services sector",
      acroExpand: "S&P Global Services Purchasing Managers' Index",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "5-15 pips",
      },
    },
  },

  // =========================
  // Housing
  // =========================

  {
    key: "building permits",
    aliases: [
      "building permits",
      "building permits m/m",
      "building permits change",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Annualized number of new building permits issued during the previous month",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, about 17 days after the month ends (released alongside Housing Starts)",
      ffNotes:
        "Building Permits are considered one of the most forward-looking housing indicators since they precede actual construction. A permit is required before groundbreaking can begin, so permits signal future construction activity.",
      whyTradersCare:
        "It's an excellent gauge of future construction activity because obtaining a permit is among the first steps in constructing a new building",
      derivedVia:
        "Survey of approximately 9,000 permit-issuing jurisdictions nationwide",
      acroExpand: "Building Permits (Building or Zoning Permits Authorized)",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "10-15 pips",
      },
    },
  },
  {
    key: "housing starts",
    aliases: [
      "housing starts",
      "housing starts m/m",
      "housing starts annualized",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Annualized number of new residential buildings that began construction during the previous month",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 17 days after the month ends",
      ffNotes:
        "Housing Starts measures the actual groundbreaking of new residential construction. It's a key indicator of housing sector health. The data is volatile and subject to large revisions. Single-family starts are generally watched more closely than multi-family.",
      whyTradersCare:
        "Residential construction has wide-reaching effects on the broader economy through job creation, materials demand, and consumer spending on home-related goods",
      derivedVia:
        "Survey of approximately 900 permit-issuing jurisdictions and field visits to construction sites",
      acroExpand: "Housing Starts (New Residential Construction)",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "10-15 pips",
      },
    },
  },
  {
    key: "existing home sales",
    aliases: [
      "existing home sales",
      "existing home sales m/m",
      "existing home sales annualized",
    ],
    metadata: {
      source: "National Association of Realtors (latest release)",
      measures:
        "Annualized number of existing residential buildings sold during the previous month",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 20 days after the month ends",
      ffNotes:
        "Existing Home Sales accounts for roughly 90% of all US home sales (the other 10% is new home sales). The data is reported at an annualized rate. Housing inventory (months' supply) and median home prices are also reported.",
      whyTradersCare:
        "Housing is a major driver of economic activity through construction jobs, materials demand, and consumer spending on furniture and appliances",
      derivedVia:
        "Data from MLS (Multiple Listing Service) systems across the country, compiled by the NAR",
      acroExpand: "Existing Home Sales",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "5-10 pips",
      },
    },
  },
  {
    key: "new home sales",
    aliases: [
      "new home sales",
      "new home sales m/m",
      "new home sales annualized",
    ],
    metadata: {
      source: "Census Bureau (latest release)",
      measures:
        "Annualized number of new single-family homes sold during the previous month",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 23 days after the month ends",
      ffNotes:
        "New Home Sales represents about 10% of total US home sales but is considered a more forward-looking indicator than Existing Home Sales because new home sales are counted when the contract is signed (not at closing). It's a timelier indicator of housing demand.",
      whyTradersCare:
        "It's a leading indicator of housing market trends and a key input into construction industry activity and consumer spending on home-related goods",
      derivedVia:
        "Survey of builders and examination of building permits and construction activity",
      acroExpand: "New Home Sales (New Residential Sales)",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "5-10 pips",
      },
    },
  },

  // =========================
  // Central Banks
  // =========================

  {
    key: "fomc rate decision",
    aliases: [
      "fomc rate decision",
      "fomc statement",
      "federal funds rate",
      "fed interest rate decision",
      "fed rate decision",
      "fomc decision",
      "interest rate decision",
    ],
    metadata: {
      source: "Federal Open Market Committee (latest decision)",
      measures:
        "The target range for the federal funds rate, the interest rate at which depository institutions lend balances to each other overnight",
      usualEffect:
        "A rate hike is bullish for USD; a rate cut or dovish statement is bearish. Forward guidance in the accompanying FOMC Statement often has more market impact than the rate decision itself",
      frequency: "Eight scheduled meetings per year",
      releaseSchedule:
        "Eight times per year (roughly every six weeks). Rate decision at 2:00 PM ET, Fed Chair press conference at 2:30 PM ET. March, June, September, and December meetings include the Summary of Economic Projections (dot plot)",
      ffNotes:
        "The FOMC Statement is released alongside the rate decision. The market focus is often on the statement's forward guidance and changes in language. The dot plot (released quarterly) shows individual members' rate projections. The press conference begins 30 minutes after the release and can be highly volatile for USD pairs.",
      whyTradersCare:
        "Short-term interest rates are the primary driver of currency valuation. The FOMC decision and forward guidance set the direction for US monetary policy and inevitably move USD pairs, equities, and bonds",
      derivedVia:
        "Voted on by the 12 members of the Federal Open Market Committee based on economic data analysis and projections",
      acroExpand: "Federal Open Market Committee Interest Rate Decision",
      tradingImpact: {
        volatility: 5,
        typicalMovement: "60-150 pips",
      },
    },
  },
  {
    key: "fomc meeting minutes",
    aliases: [
      "fomc meeting minutes",
      "fomc minutes",
      "fed minutes",
      "fomc notes",
    ],
    metadata: {
      source: "Federal Open Market Committee (latest meeting)",
      measures:
        "Detailed record of the FOMC meeting discussions, including economic outlook, policy debate, and individual member views",
      usualEffect:
        "Hawkish minutes (members leaning toward tightening) are bullish for USD; dovish minutes (leaning toward easing) are bearish",
      frequency: "Eight times per year",
      releaseSchedule:
        "Three weeks after each FOMC meeting, released at 2:00 PM ET",
      ffNotes:
        "The Minutes provide more color on the debate that shaped the rate decision. Traders look for clues about the balance of hawkish vs. dovish sentiment, dissenters, and the breadth of support for the decision. Markets generally move less on Minutes than on the initial statement and press conference.",
      whyTradersCare:
        "Provides deeper insight into the FOMC's thinking beyond the terse statement. Reveals the range of views among committee members and potential future policy shifts",
      derivedVia:
        "Detailed transcript and summary of the two-day FOMC meeting deliberations",
      acroExpand: "Federal Open Market Committee Meeting Minutes",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "20-40 pips",
      },
    },
  },
  {
    key: "fed chair speech",
    aliases: [
      "fed chair speech",
      "federal reserve chair speech",
      "fed chair speaks",
      "powell speech",
      "chair powell speaks",
    ],
    metadata: {
      source: "Federal Reserve Chair (live event)",
      measures:
        "Public remarks by the Chair of the Federal Reserve, often including a Q&A session",
      usualEffect:
        "Hawkish remarks are bullish for USD; dovish remarks are bearish. Q&A sessions can be more volatile than prepared remarks, especially if the Chair makes unexpected statements in response to audience or press questions",
      frequency: "As scheduled",
      releaseSchedule:
        "Varies — includes Congressional testimony (semi-annual Humphrey-Hawkins), press conferences, and scheduled speaking engagements at conferences and universities",
      ffNotes:
        "Fed Chair speeches can move markets significantly if they hint at changes in monetary policy. Congressional testimony is particularly important because the Chair faces direct questioning about policy under oath. Even seemingly routine speeches can contain market-moving comments.",
      whyTradersCare:
        "The Fed Chair is the most influential central banker in the world. Any hint about the future path of interest rates can move USD pairs, equities, and bonds",
      derivedVia:
        "Live public remarks, often followed by audience Q&A or press questioning",
      acroExpand: "Federal Reserve Chair Speech",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "30-80 pips",
      },
    },
  },
  {
    key: "ecb rate decision",
    aliases: [
      "ecb rate decision",
      "ecb interest rate decision",
      "ecb monetary policy statement",
      "european central bank",
    ],
    metadata: {
      source: "European Central Bank (latest decision)",
      measures:
        "The ECB's main refinancing rate, the interest rate at which banks can borrow from the ECB",
      usualEffect:
        "Rate hike is bullish for EUR; rate cut or dovish statement is bearish",
      frequency: "Eight scheduled meetings per year",
      releaseSchedule:
        "Eight times per year (roughly every six weeks). Rate decision at 2:15 PM CET, press conference at 2:45 PM CET",
      ffNotes:
        "The ECB Governing Council sets rates for the Eurozone. The press conference 30 minutes after the decision is typically the most market-moving part. ECB President Lagarde's opening statement and Q&A draw the most attention.",
      whyTradersCare:
        "The ECB controls monetary policy for the world's second-largest currency bloc. Its decisions directly affect EUR pairs and set the tone for European financial markets",
      derivedVia: "Voted on by the 26 members of the ECB Governing Council",
      acroExpand: "European Central Bank Interest Rate Decision",
      tradingImpact: {
        volatility: 5,
        typicalMovement: "40-80 pips (EUR pairs)",
      },
    },
  },
  {
    key: "ecb press conference",
    aliases: [
      "ecb press conference",
      "ecb president speaks",
      "ecb president lagarde speaks",
      "lagarde speaks",
      "ecb speech",
    ],
    metadata: {
      source: "European Central Bank (live event)",
      measures:
        "Press conference following the ECB rate decision, including prepared statement and Q&A with journalists",
      usualEffect:
        "Hawkish tone is bullish for EUR; dovish tone is bearish. The Q&A session is often more volatile than the prepared remarks",
      frequency: "Following each ECB rate decision meeting",
      releaseSchedule:
        "Six of the eight annual ECB meetings are followed by a press conference at 2:45 PM CET (30 minutes after the rate decision)",
      ffNotes:
        "This is usually the most important 45 minutes of the ECB cycle. The introductory statement is prepared, but Q&A can produce off-script comments that move markets. Traders parse every word for hints about future rate moves.",
      whyTradersCare:
        "The press conference provides detailed forward guidance on ECB policy and the Governing Council's economic outlook. It often generates more EUR volatility than the rate decision itself",
      derivedVia:
        "Live press conference with the ECB President and Vice President, streamed on the ECB website",
      acroExpand: "European Central Bank Press Conference",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "30-60 pips (EUR pairs)",
      },
    },
  },
  {
    key: "boe rate decision",
    aliases: [
      "boe rate decision",
      "boe interest rate decision",
      "bank of england",
      "boe monetary policy",
      "official bank rate",
    ],
    metadata: {
      source: "Bank of England (latest decision)",
      measures:
        "The Bank of England's official Bank Rate, the key interest rate for the UK economy",
      usualEffect:
        "Rate hike is bullish for GBP; rate cut or dovish vote split is bearish",
      frequency: "Eight scheduled meetings per year",
      releaseSchedule:
        "Eight times per year (roughly every six weeks). Rate decision at 12:00 PM GMT",
      ffNotes:
        "The MPC (Monetary Policy Committee) vote split is critically important. A 9-0 vote is different from a 5-4 vote. The minutes are released simultaneously with the decision (unlike other central banks). Dissenting votes are closely watched.",
      whyTradersCare:
        "The Bank of England sets UK monetary policy. Its decisions and forward guidance directly affect GBP pairs and UK financial assets",
      derivedVia: "Voted on by the 9 members of the Monetary Policy Committee",
      acroExpand: "Bank of England Official Bank Rate",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "30-60 pips (GBP pairs)",
      },
    },
  },
  {
    key: "boe governor speaks",
    aliases: [
      "boe governor speaks",
      "boe gov bailey speaks",
      "bailey speaks",
      "boe bailey speech",
      "boe governor bailey",
    ],
    metadata: {
      source: "Bank of England Governor (live event)",
      measures:
        "Public remarks by the Governor of the Bank of England, sometimes including Q&A",
      usualEffect:
        "Hawkish remarks are bullish for GBP; dovish remarks are bearish",
      frequency: "As scheduled",
      releaseSchedule:
        "Varies — includes press conferences, Treasury Select Committee hearings, and scheduled speeches at conferences",
      ffNotes:
        "The Governor's public comments can provide insight into the MPC's thinking between scheduled meetings. Treasury Select Committee testimony is particularly important for policy signals.",
      whyTradersCare:
        "The Governor is the most influential voice on UK monetary policy. Comments can move GBP pairs significantly",
      derivedVia: "Live public remarks or testimony",
      acroExpand: "Bank of England Governor Speech",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "15-30 pips (GBP pairs)",
      },
    },
  },
  {
    key: "boc rate decision",
    aliases: [
      "boc rate decision",
      "bank of canada rate",
      "boc overnight rate",
      "boc interest rate decision",
    ],
    metadata: {
      source: "Bank of Canada (latest decision)",
      measures:
        "The overnight rate target, the key interest rate set by the Bank of Canada",
      usualEffect:
        "Rate hike is bullish for CAD; rate cut or dovish statement is bearish",
      frequency: "Eight scheduled meetings per year",
      releaseSchedule:
        "Eight times per year. Rate decision at 10:00 AM ET, followed by Monetary Policy Report (quarterly) and press conference",
      ffNotes:
        "The BOC was the first G7 central bank to begin a rate-cutting cycle in 2024. The Monetary Policy Report (MPR) released quarterly provides detailed economic projections. The opening statement in the press release often contains key forward guidance.",
      whyTradersCare:
        "The Bank of Canada sets monetary policy for Canada. CAD is closely tied to oil prices and US economic conditions, but BOC decisions are a primary short-term driver",
      derivedVia: "Voted on by the Governing Council of the Bank of Canada",
      acroExpand: "Bank of Canada Overnight Rate Target",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "20-40 pips (CAD pairs)",
      },
    },
  },
  {
    key: "boc gov speaks",
    aliases: [
      "boc gov speaks",
      "boc governor speaks",
      "boc gov macklem speaks",
      "macklem speaks",
      "boc macklem speech",
    ],
    metadata: {
      source: "Bank of Canada Governor (live event)",
      measures:
        "Public remarks by the Governor of the Bank of Canada, often including press conference or Q&A",
      usualEffect:
        "Hawkish remarks are bullish for CAD; dovish remarks are bearish",
      frequency: "As scheduled",
      releaseSchedule:
        "Varies — includes post-decision press conferences, parliamentary testimony, and scheduled speaking engagements",
      ffNotes:
        "The Governor's remarks following rate decisions (in the press conference) tend to have the most market impact. Speeches between meetings are watched for any shift in tone.",
      whyTradersCare:
        "The Governor provides the most direct insight into the BOC's policy stance and economic assessment",
      derivedVia: "Live public remarks or press conference",
      acroExpand: "Bank of Canada Governor Speech",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips (CAD pairs)",
      },
    },
  },
  {
    key: "rba rate decision",
    aliases: [
      "rba rate decision",
      "reserve bank of australia",
      "rba cash rate",
      "rba interest rate",
    ],
    metadata: {
      source: "Reserve Bank of Australia (latest decision)",
      measures: "The cash rate target, the key interest rate for Australia",
      usualEffect:
        "Rate hike is bullish for AUD; rate cut or dovish statement is bearish",
      frequency: "Eight scheduled meetings per year",
      releaseSchedule:
        "Eight times per year. Rate decision at 2:30 PM AEST, followed by Governor's press conference one hour later",
      ffNotes:
        "The RBA Statement on Monetary Policy, including updated economic forecasts, is released quarterly. The Governor's press conference is a key driver of AUD volatility.",
      whyTradersCare:
        "The RBA sets Australian monetary policy. AUD is often driven by commodity prices and Chinese demand, but RBA decisions set the near-term direction",
      derivedVia: "Voted on by the RBA Board",
      acroExpand: "Reserve Bank of Australia Cash Rate Target",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "20-40 pips (AUD pairs)",
      },
    },
  },
  {
    key: "rbnz rate decision",
    aliases: [
      "rbnz rate decision",
      "reserve bank of new zealand",
      "rbnz ocr",
      "rbnz official cash rate",
    ],
    metadata: {
      source: "Reserve Bank of New Zealand (latest decision)",
      measures:
        "The Official Cash Rate (OCR), the key interest rate for New Zealand",
      usualEffect:
        "Rate hike is bullish for NZD; rate cut or dovish statement is bearish",
      frequency: "Seven scheduled meetings per year",
      releaseSchedule:
        "Seven times per year. Rate decision and Monetary Policy Statement released together",
      ffNotes:
        "The Monetary Policy Statement includes updated economic projections and OCR track (projected rate path). The OCR track is unique to the RBNZ and is closely watched for signals about future policy.",
      whyTradersCare:
        "The RBNZ sets NZ monetary policy. The OCR track provides explicit forward guidance that can move NZD pairs significantly",
      derivedVia: "Voted on by the RBNZ Monetary Policy Committee",
      acroExpand: "Reserve Bank of New Zealand Official Cash Rate",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "20-40 pips (NZD pairs)",
      },
    },
  },
  {
    key: "snb rate decision",
    aliases: [
      "snb rate decision",
      "swiss national bank",
      "snb policy rate",
      "snb interest rate",
    ],
    metadata: {
      source: "Swiss National Bank (latest decision)",
      measures: "The SNB policy rate, the key interest rate for Switzerland",
      usualEffect:
        "Rate hike is bullish for CHF; rate cut or dovish statement is bearish. Unexpected changes tend to have outsized effects because CHF is often used as a carry-trade funding currency",
      frequency: "Four scheduled meetings per year",
      releaseSchedule:
        "Four times per year (quarterly). Rate decision at 9:30 AM CET, followed by press conference",
      ffNotes:
        "The SNB only meets quarterly, making each decision higher-stakes than more frequent central bank meetings. The SNB has historically been willing to intervene in FX markets to manage CHF strength. The press conference provides key forward guidance.",
      whyTradersCare:
        "The SNB sets Swiss monetary policy. CHF is a major safe-haven currency, and unexpected SNB policy shifts can move CHF pairs dramatically",
      derivedVia: "Voted on by the SNB Governing Board",
      acroExpand: "Swiss National Bank Policy Rate",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "20-50 pips (CHF pairs)",
      },
    },
  },

  // =========================
  // Consumer
  // =========================

  {
    key: "cb consumer confidence",
    aliases: [
      "cb consumer confidence",
      "consumer confidence",
      "conference board consumer confidence",
    ],
    metadata: {
      source: "The Conference Board (latest release)",
      measures:
        "Level of a composite index based on surveyed households about their assessment of current and future economic conditions",
      usualEffect:
        "'Actual' greater than 'Forecast' is good for currency; reflects consumer optimism and willingness to spend",
      frequency: "Monthly",
      releaseSchedule: "Monthly, last Tuesday of the reference month",
      ffNotes:
        "The Consumer Confidence Index surveys households on business conditions, employment, and family income expectations for the next six months. It's one of the two primary US consumer sentiment measures (alongside the University of Michigan survey). Readings above 100 indicate optimism.",
      whyTradersCare:
        "Consumer confidence is a leading indicator of consumer spending. When consumers are confident, they're more likely to spend, which drives economic growth",
      derivedVia:
        "Survey of approximately 3,000 US households about current and expected economic conditions",
      acroExpand: "Conference Board Consumer Confidence Index",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "10-20 pips",
      },
    },
  },
  {
    key: "michigan consumer sentiment",
    aliases: [
      "michigan consumer sentiment",
      "university of michigan",
      "michigan sentiment",
      "michigan consumer",
      "uom consumer sentiment",
    ],
    metadata: {
      source: "University of Michigan (latest release)",
      measures:
        "Level of a composite index based on surveyed US households about their personal financial conditions and buying attitudes",
      usualEffect: "'Actual' greater than 'Forecast' is good for currency",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, Preliminary release around mid-month (Friday), Final release at month-end",
      ffNotes:
        "The Michigan Consumer Sentiment Index is one of the two primary US consumer sentiment measures. The Preliminary release is based on about 60% of the final survey responses and tends to have more market impact than the Final. The report also includes 1-year and 5-10 year inflation expectations, which are closely watched by the Fed.",
      whyTradersCare:
        "Consumer sentiment is a leading indicator of consumer spending. The inflation expectations component provides a unique forward-looking inflation gauge",
      derivedVia: "Monthly telephone survey of approximately 500 US households",
      acroExpand: "University of Michigan Consumer Sentiment Index",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "10-15 pips",
      },
    },
  },

  // =========================
  // Trade & Commodities
  // =========================

  {
    key: "trade balance",
    aliases: [
      "trade balance",
      "goods trade balance",
      "international trade",
      "trade deficit",
    ],
    metadata: {
      source: "Census Bureau / Bureau of Economic Analysis (latest release)",
      measures:
        "Difference in value between imported and exported goods and services during the reported month",
      usualEffect:
        "A smaller deficit (or larger surplus) is generally good for currency in the long term, though month-to-month readings rarely move markets significantly",
      frequency: "Monthly",
      releaseSchedule: "Monthly, about 35 days after the month ends",
      ffNotes:
        "The Trade Balance is a lagging indicator. The Advance Goods Trade Balance (released about a week before) gives an early read. The full report includes both goods and services. Long-running trade deficits have contributed to the large US current account deficit.",
      whyTradersCare:
        "The trade balance is a component of GDP. Persistent deficits can put downward pressure on a currency over the long term, but short-term market reactions are typically muted",
      derivedVia:
        "Compiled from customs documents, business surveys, and administrative data on imports and exports",
      acroExpand: "International Trade in Goods and Services (Trade Balance)",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "5-15 pips",
      },
    },
  },
  {
    key: "current account",
    aliases: [
      "current account",
      "current account balance",
      "current account deficit",
    ],
    metadata: {
      source: "Bureau of Economic Analysis (latest release)",
      measures:
        "Difference between a nation's savings and its investment, including the trade balance, net income from abroad, and net current transfers",
      usualEffect:
        "A smaller deficit is generally good for currency in the long term. Short-term market impact is usually minimal as it's a quarterly, lagging indicator",
      frequency: "Quarterly",
      releaseSchedule: "Quarterly, about 75 days after quarter-end",
      ffNotes:
        "The Current Account is the broadest measure of a country's international transactions. The US has run persistent current account deficits for decades. This report rarely moves markets directly but influences longer-term currency valuation models.",
      whyTradersCare:
        "It represents the broadest measure of international trade and capital flows. A widening deficit can signal reduced demand for domestic currency",
      derivedVia:
        "Aggregated from trade data, income surveys, and international financial flow reports",
      acroExpand: "Current Account Balance",
      tradingImpact: {
        volatility: 2,
        typicalMovement: "5-10 pips",
      },
    },
  },
  {
    key: "crude oil inventories",
    aliases: [
      "crude oil inventories",
      "eia crude oil",
      "crude oil stocks",
      "oil inventories",
    ],
    metadata: {
      source: "Energy Information Administration (latest release)",
      measures:
        "Change in the number of barrels of crude oil held in inventory by commercial firms during the past week",
      usualEffect:
        "A larger-than-expected draw (decline in inventories) is bullish for oil prices and CAD (Canada is a major oil exporter); a build (increase in inventories) is bearish",
      frequency: "Weekly",
      releaseSchedule: "Weekly, every Wednesday at 10:30 AM ET",
      ffNotes:
        "The EIA Weekly Petroleum Status Report is one of the most closely watched commodity reports. The API (American Petroleum Institute) releases its own inventory estimates on Tuesday evening (4:30 PM ET), which often sets expectations for the EIA report. Large deviations from the API report can move oil markets significantly.",
      whyTradersCare:
        "Oil inventory levels directly affect crude oil prices, which in turn influence energy stocks, inflation expectations, and commodity currencies (especially CAD, NOK, and RUB)",
      derivedVia:
        "Weekly survey of petroleum refineries, bulk terminals, pipelines, and storage facilities",
      acroExpand: "Energy Information Administration Crude Oil Inventories",
      tradingImpact: {
        volatility: 3,
        typicalMovement: "20-40 pips",
      },
    },
  },
  {
    key: "cpi flash estimate y/y",
    aliases: [
      "cpi flash estimate",
      "cpi flash estimate yoy",
      "cpi flash estimate y/y",
      "flash cpi",
    ],
    metadata: {
      source: "Eurostat (latest release)",
      measures:
        "Early estimate of the change in the price of goods and services purchased by consumers in the Eurozone",
      usualEffect:
        "'Actual' greater than 'Forecast' is good for currency if it signals the ECB may tighten policy",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, on the last business day of the reference month (Flash estimate)",
      ffNotes:
        "The Eurozone CPI Flash Estimate is an early reading based on data from Germany and a few other major economies. The Final release follows roughly two weeks later. The Flash tends to have more market impact since it's the first look at Eurozone inflation for the month.",
      whyTradersCare:
        "Consumer prices are the primary driver of ECB monetary policy. Flash CPI often sets the tone for EUR pairs heading into the new month",
      derivedVia:
        "Early aggregation of consumer price data from Eurozone member states",
      acroExpand:
        "Eurozone Consumer Price Index Flash Estimate (Year-over-Year)",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "15-30 pips (EUR pairs)",
      },
    },
  },
  {
    key: "core cpi flash estimate y/y",
    aliases: [
      "core cpi flash estimate yoy",
      "core cpi flash estimate y/y",
      "core cpi flash",
      "flash core cpi",
    ],
    metadata: {
      source: "Eurostat (latest release)",
      measures:
        "Early estimate of the change in consumer prices in the Eurozone, excluding energy, food, alcohol, and tobacco",
      usualEffect:
        "'Actual' greater than 'Forecast' is good for currency if it signals tighter ECB policy",
      frequency: "Monthly",
      releaseSchedule:
        "Monthly, on the last business day of the reference month (Flash estimate)",
      ffNotes:
        "Core CPI Flash Estimate is released alongside the headline Flash CPI. Core inflation is the ECB's primary focus because it strips out volatile components. This number can diverge significantly from the headline figure.",
      whyTradersCare:
        "It's the ECB's preferred measure of underlying inflation trends. Surprises here can shift expectations for future ECB rate moves",
      derivedVia:
        "Early aggregation of consumer price data from Eurozone member states, excluding volatile components",
      acroExpand: "Eurozone Core Consumer Price Index Flash Estimate",
      tradingImpact: {
        volatility: 4,
        typicalMovement: "15-30 pips (EUR pairs)",
      },
    },
  },
];

function normalizeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, EventMetadata>();

for (const entry of REGISTRY) {
  for (const alias of entry.aliases) {
    LOOKUP.set(normalizeKey(alias), entry.metadata);
  }
}

export function lookupEventMetadata(title: string): EventMetadata | undefined {
  return LOOKUP.get(normalizeKey(title));
}
