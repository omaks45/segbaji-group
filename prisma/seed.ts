import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import * as bcrypt from 'bcrypt';
import { slugify } from '../src/common/slug/slugify.util'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEPARTMENTS = [
    'Legal & Documentation',
    'Projects',
    'Engineering',
    'Operations',
    'Surveying & Mapping',
    'Design',
    'Interior Finishing',
    'Renovation & Remodeling',
    'Administration',
];

const SERVICES: { name: string; summary: string }[] = [
    { name: 'Construction', summary: 'We handle all kinds of building construction from start to finish with quality and precision.' },
    { name: 'Engineering', summary: 'We design and construct roads, drainage, and other civil infrastructure projects.' },
    { name: 'Surveying & Mapping', summary: 'Professional land surveying and mapping services for accurate planning and documentation.' },
    { name: 'Project Management', summary: 'We manage your projects efficiently from concept to completion.' },
    { name: 'Architecture & Design', summary: 'Creative architectural expertise and design solutions.' },
    { name: 'Finishing & Interior Works', summary: 'Professional finishing and interior solutions.' },
    { name: 'Renovation & Remodeling', summary: 'Space renovation and improvement services.' },
    { name: 'Infrastructure Development', summary: 'Development of essential infrastructure.' },
    { name: 'Consultancy', summary: 'Professional advice and project guidance.' },
];

// Simplified permission tiers, same approach as Phase 1 — real per-role
// editing can replace this later without changing the table shape.
const MANAGE = ['*:read', '*:write'];
const EDIT = ['content:read', 'content:write', 'leads:read'];
const VIEW = ['content:read', 'leads:read'];

// Note: "Architecture" is seeded exactly as given in the filter list —
// worth double-checking with whoever supplied it whether "Architect" was
// meant instead, since every other entry here is a job title and this
// one reads as a discipline name.
const ROLES: { name: string; permissions: string[] }[] = [
    { name: 'Super Admin', permissions: ['*'] }, // not in the client's list — kept so seeding always has a working login
    { name: 'Team Leader', permissions: MANAGE },
    { name: 'Operation Manager', permissions: MANAGE },
    { name: 'Attorney', permissions: VIEW },
    { name: 'Electrician', permissions: EDIT },
    { name: 'Site Engineer', permissions: EDIT },
    { name: 'Surveyor', permissions: EDIT },
    { name: 'Architecture', permissions: EDIT },
    { name: 'Interior Designer', permissions: EDIT },
    { name: 'Engineer', permissions: EDIT },
    { name: 'Plumber', permissions: EDIT },
];

async function main() {
    console.log('Seeding departments...');
    for (const name of DEPARTMENTS) {
        await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    }

    console.log('Seeding roles...');
    for (const role of ROLES) {
        await prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: { name: role.name, permissions: role.permissions },
        });
    }

    console.log('Seeding services...');
    for (const service of SERVICES) {
    const slug = slugify(service.name);
    await prisma.service.upsert({
        where: { name: service.name },
        update: { slug, summary: service.summary }, // backfills existing rows, since this upsert already ran once before
        create: { name: service.name, slug, summary: service.summary },
    });
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
        console.warn('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin creation.');
    } else {
        console.log(`Seeding super admin (${superAdminEmail})...`);
        const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
        const administrationDept = await prisma.department.findUniqueOrThrow({ where: { name: 'Administration' } });
        const passwordHash = await bcrypt.hash(superAdminPassword, 12);

        await prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {},
        create: {
            fullName: 'Segbaji Group Super Admin',
            email: superAdminEmail,
            passwordHash,
            status: 'ACTIVE',
            roleId: superAdminRole.id,
            departmentId: administrationDept.id,
            joinedAt: new Date(),
        },
        });
    }

    console.log('Seed complete.');
}

main()
    .catch((err) => { console.error('Seed failed:', err); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });