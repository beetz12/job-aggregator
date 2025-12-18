/**
 * Seed Demo Data Script
 *
 * Pre-populates the job aggregator with curated demo jobs for hackathon demos.
 * Run with: npx ts-node scripts/seed-demo-data.ts
 */

import crypto from 'crypto'

// Demo jobs with realistic, compelling data
const demoJobs = [
  // HackerNews Jobs
  {
    title: 'Senior Full Stack Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    remote: true,
    url: 'https://stripe.com/jobs',
    description: `We're looking for experienced full-stack engineers to join our Payments team. You'll work on the core infrastructure that powers millions of businesses worldwide.

Requirements:
- 5+ years of experience with TypeScript, React, and Node.js
- Experience with distributed systems and microservices
- Strong understanding of payment systems and financial regulations
- Excellent communication skills

What we offer:
- Competitive salary and equity
- Remote-first culture
- Annual learning budget
- Top-tier health benefits`,
    source: 'hackernews' as const,
    tags: ['TypeScript', 'React', 'Node.js', 'Payments', 'Full Stack'],
    postedDaysAgo: 1,
  },
  {
    title: 'AI/ML Engineer - LLM Platform',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    remote: true,
    url: 'https://anthropic.com/careers',
    description: `Join our team building the infrastructure for safe and beneficial AI systems. You'll work on training, evaluating, and deploying large language models.

Requirements:
- PhD or equivalent experience in ML, AI, or related field
- Experience with PyTorch and distributed training
- Strong background in NLP and transformer architectures
- Publications in top ML conferences (NeurIPS, ICML, etc.)

Impact:
- Work on cutting-edge AI safety research
- Collaborate with world-class researchers
- Shape the future of AI development`,
    source: 'hackernews' as const,
    tags: ['AI/ML', 'Python', 'PyTorch', 'LLMs', 'Research'],
    postedDaysAgo: 0,
  },
  {
    title: 'Backend Engineer - Infrastructure',
    company: 'Figma',
    location: 'San Francisco, CA',
    remote: true,
    url: 'https://figma.com/careers',
    description: `Build the real-time collaboration infrastructure that powers Figma. Handle millions of concurrent users with sub-millisecond latency.

You'll work on:
- Distributed systems for real-time collaboration
- Performance optimization at scale
- Infrastructure automation and reliability

Tech stack: Rust, C++, TypeScript, PostgreSQL, Redis`,
    source: 'hackernews' as const,
    tags: ['Rust', 'C++', 'Infrastructure', 'Real-time', 'Backend'],
    postedDaysAgo: 2,
  },

  // Arbeitnow Jobs (European focus)
  {
    title: 'React Native Developer',
    company: 'N26',
    location: 'Berlin, Germany',
    remote: true,
    url: 'https://n26.com/careers',
    description: `Join Europe's leading mobile bank and help millions of people manage their money smarter.

What you'll do:
- Build and maintain our React Native mobile apps
- Implement new banking features with security in mind
- Collaborate with design and backend teams
- Write clean, maintainable, tested code

Requirements:
- 3+ years React Native experience
- Strong JavaScript/TypeScript skills
- Experience with mobile app architecture
- Knowledge of mobile security best practices`,
    source: 'arbeitnow' as const,
    tags: ['React Native', 'TypeScript', 'Mobile', 'FinTech', 'Banking'],
    postedDaysAgo: 1,
  },
  {
    title: 'DevOps Engineer',
    company: 'Spotify',
    location: 'Stockholm, Sweden',
    remote: false,
    url: 'https://spotify.com/jobs',
    description: `Help us scale the world's largest audio streaming platform. Work with cutting-edge cloud infrastructure serving 500M+ users.

Responsibilities:
- Design and maintain CI/CD pipelines
- Manage Kubernetes clusters at scale
- Implement infrastructure as code
- On-call rotation for critical services

Stack: GCP, Kubernetes, Terraform, Python, Go`,
    source: 'arbeitnow' as const,
    tags: ['DevOps', 'Kubernetes', 'GCP', 'Terraform', 'Python'],
    postedDaysAgo: 3,
  },
  {
    title: 'Senior Frontend Engineer',
    company: 'Klarna',
    location: 'Amsterdam, Netherlands',
    remote: true,
    url: 'https://klarna.com/careers',
    description: `Build the future of shopping with Klarna. Create seamless checkout experiences used by millions of shoppers daily.

What we're looking for:
- Expert-level React and TypeScript
- Experience with micro-frontends
- Performance optimization expertise
- A/B testing and experimentation mindset

Benefits:
- Flexible work arrangements
- Stock options
- Learning & development budget
- Wellness programs`,
    source: 'arbeitnow' as const,
    tags: ['React', 'TypeScript', 'Frontend', 'FinTech', 'E-commerce'],
    postedDaysAgo: 0,
  },

  // Reddit Jobs
  {
    title: 'Founding Engineer - AI Startup',
    company: 'Stealth AI Startup (YC W24)',
    location: 'Remote',
    remote: true,
    url: 'https://workatastartup.com',
    description: `Looking for passionate engineers to join our founding team. We're building AI-powered developer tools that will change how software is built.

We offer:
- Significant equity (1-3%)
- Competitive salary
- Full remote work
- Direct impact on product direction

Looking for:
- Strong full-stack skills
- Experience with LLMs/AI
- Startup mindset
- Product intuition`,
    source: 'reddit' as const,
    tags: ['Startup', 'AI', 'Full Stack', 'YC', 'Founding Team'],
    postedDaysAgo: 0,
  },
  {
    title: 'Go Developer - Distributed Systems',
    company: 'CockroachDB',
    location: 'New York, NY',
    remote: true,
    url: 'https://cockroachlabs.com/careers',
    description: `Work on one of the most challenging distributed systems problems: building a globally-distributed SQL database.

[Hiring from r/golang]

Requirements:
- Strong Go programming skills
- Understanding of distributed consensus
- Database internals knowledge is a plus
- Computer science fundamentals

This is a high-impact role where you'll work on:
- Query optimization
- Distributed transactions
- Cluster management
- Performance engineering`,
    source: 'reddit' as const,
    tags: ['Go', 'Distributed Systems', 'Databases', 'Backend', 'SQL'],
    postedDaysAgo: 2,
  },
  {
    title: 'Security Engineer',
    company: '1Password',
    location: 'Toronto, Canada',
    remote: true,
    url: 'https://1password.com/careers',
    description: `Join the security team at 1Password and help protect millions of users' most sensitive data.

[Posted in r/netsec]

You'll work on:
- Cryptographic implementations
- Security architecture review
- Penetration testing
- Incident response

Requirements:
- 5+ years in security engineering
- Deep cryptography knowledge
- Bug bounty experience preferred
- Security certifications (OSCP, etc.)`,
    source: 'reddit' as const,
    tags: ['Security', 'Cryptography', 'InfoSec', 'Rust', 'Go'],
    postedDaysAgo: 1,
  },
  {
    title: 'Staff Data Engineer',
    company: 'dbt Labs',
    location: 'Philadelphia, PA',
    remote: true,
    url: 'https://getdbt.com/careers',
    description: `Build the future of analytics engineering at dbt Labs. We're hiring staff engineers to scale our data platform.

[r/dataengineering]

What you'll do:
- Design data pipelines for our cloud platform
- Scale to thousands of concurrent dbt runs
- Build observability and monitoring tools
- Mentor junior engineers

Tech: Python, Snowflake, BigQuery, Databricks, Kubernetes`,
    source: 'reddit' as const,
    tags: ['Data Engineering', 'Python', 'SQL', 'Snowflake', 'dbt'],
    postedDaysAgo: 3,
  },
]

// Helper to generate deterministic IDs
function generateJobId(job: typeof demoJobs[0]): string {
  const hash = crypto.createHash('md5')
  hash.update(`${job.source}-${job.company}-${job.title}`)
  return hash.digest('hex').substring(0, 16)
}

// Calculate health score based on posting age
function calculateHealthScore(daysAgo: number): number {
  if (daysAgo === 0) return 100
  if (daysAgo === 1) return 90
  if (daysAgo <= 3) return 75
  if (daysAgo <= 7) return 60
  if (daysAgo <= 14) return 40
  return 20
}

// Calculate date from days ago
function getDateFromDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

// Generate the seed data
async function seedDemoData() {
  console.log('🌱 Seeding demo data for Job Aggregator...\n')

  const API_BASE = process.env.API_URL || 'http://localhost:8000'

  // First check if API is available
  try {
    const healthRes = await fetch(`${API_BASE}/health`)
    if (!healthRes.ok) {
      console.error('❌ Backend API is not healthy. Start the backend first.')
      process.exit(1)
    }
    console.log('✅ Backend API is healthy\n')
  } catch (error) {
    console.error(`❌ Cannot connect to backend at ${API_BASE}. Start the backend first.`)
    process.exit(1)
  }

  // Transform demo jobs to full Job format
  const jobs = demoJobs.map(demo => ({
    id: generateJobId(demo),
    title: demo.title,
    company: demo.company,
    location: demo.location,
    remote: demo.remote,
    url: demo.url,
    description: demo.description,
    source: demo.source,
    postedAt: getDateFromDaysAgo(demo.postedDaysAgo),
    fetchedAt: new Date().toISOString(),
    tags: demo.tags,
    healthScore: calculateHealthScore(demo.postedDaysAgo),
  }))

  console.log(`📝 Prepared ${jobs.length} demo jobs:\n`)

  // Log each job
  jobs.forEach((job, i) => {
    console.log(`  ${i + 1}. [${job.source}] ${job.title} at ${job.company}`)
    console.log(`     Health: ${job.healthScore}% | Tags: ${job.tags.slice(0, 3).join(', ')}`)
  })

  console.log('\n')

  // Since we can't directly write to Motia state from outside,
  // we'll use the normalize-job event which will index the jobs
  // For now, output the JSON that can be used for testing

  console.log('📦 Demo data prepared successfully!')
  console.log('\nTo use this data, you can:')
  console.log('1. Use the Motia Workbench to emit job events manually')
  console.log('2. Trigger source refreshes which will fetch real data\n')

  // Output JSON for manual use if needed
  const outputPath = './demo-jobs.json'
  const fs = await import('fs')
  fs.writeFileSync(outputPath, JSON.stringify(jobs, null, 2))
  console.log(`💾 Demo jobs saved to ${outputPath}\n`)

  // Also create source metadata for demo
  const sourceMetadata = [
    { source: 'hackernews', jobCount: jobs.filter(j => j.source === 'hackernews').length },
    { source: 'arbeitnow', jobCount: jobs.filter(j => j.source === 'arbeitnow').length },
    { source: 'reddit', jobCount: jobs.filter(j => j.source === 'reddit').length },
  ]

  console.log('📊 Source breakdown:')
  sourceMetadata.forEach(s => {
    console.log(`   ${s.source}: ${s.jobCount} jobs`)
  })

  console.log('\n✨ Done!')
}

// Run the seeder
seedDemoData().catch(console.error)
