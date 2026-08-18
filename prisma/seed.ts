/* eslint-disable prettier/prettier */
/**
 * Seeds the departments and roles from the PRD, plus one Super Admin
 * account so there's a way to log in once auth lands in Phase 2.
 *
 * Idempotent by design (upsert on unique fields) — safe to re-run after
 * `prisma migrate reset` or on a fresh environment without creating
 * duplicates or crashing on a unique-constraint error.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEPARTMENTS = [
    'Administration',
    'Consultancy',
    'Engineering',
    'Surveying & Mapping',
    'Project Management',
    'Construction',
    'Property & Real Estate',
    'Architecture & Design',
    'Finishing & Remodeling',
    'Renovations & Remodeling',
    'Infrastructure Development',
];

// Simplified permission tiers (see Backend Requirements v2, Section 4.5)
// mapped onto the client's named roles. "*" = unrestricted (Super Admin
// only). Real per-role permission editing can replace this later without
// changing the Role table's shape.
const MANAGE = ['*:read', '*:write'];
const EDIT = ['content:read', 'content:write', 'leads:read'];
const VIEW = ['content:read', 'leads:read'];

const ROLES: { name: string; permissions: string[] }[] = [
    { name: 'Super Admin', permissions: ['*'] },
    { name: 'Team Lead', permissions: MANAGE },
    { name: 'Operations Manager', permissions: MANAGE },
    { name: 'Attorney', permissions: VIEW },
    { name: 'Site Engineer', permissions: EDIT },
    { name: 'Surveyor', permissions: EDIT },
    { name: 'Project Manager', permissions: MANAGE },
    { name: 'Architect', permissions: EDIT },
    { name: 'Admin Coordinator', permissions: MANAGE },
    { name: 'Admin Officer', permissions: EDIT },
    { name: 'Analyst', permissions: VIEW },
    { name: 'Sales Executive', permissions: EDIT },
    { name: 'Accountant', permissions: VIEW },
    { name: 'Real Estate Manager', permissions: MANAGE },
    { name: 'Procurement Officer', permissions: EDIT },
    { name: 'Property Manager', permissions: EDIT },
    { name: 'Technician', permissions: VIEW },
    { name: 'Interior Designer', permissions: EDIT },
    { name: 'Supervisor', permissions: EDIT },
    { name: 'Development Officer', permissions: EDIT },
    { name: 'Renovation Manager', permissions: MANAGE },
    { name: 'Project Consultant', permissions: VIEW },
];

async function main() {
    console.log('Seeding departments...');
    for (const name of DEPARTMENTS) {
        await prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
        });
    }

    console.log('Seeding roles...');
    for (const role of ROLES) {
        await prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: { name: role.name, permissions: role.permissions },
        });
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superAdminEmail || !superAdminPassword) {
        console.warn(
        'SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin creation. ' +
            'Set them in .env and re-run `npm run prisma:seed` to create the first login.',
        );
    } else {
        console.log(`Seeding super admin (${superAdminEmail})...`);
        const superAdminRole = await prisma.role.findUniqueOrThrow({
        where: { name: 'Super Admin' },
        });
        const administrationDept = await prisma.department.findUniqueOrThrow({
        where: { name: 'Administration' },
        });

        // Cost factor 12: deliberately above bcrypt's default (10) since this
        // hash only needs to be computed once at seed time, but is worth
        // slowing down for anyone attempting an offline brute-force later.
        const passwordHash = await bcrypt.hash(superAdminPassword, 12);

        await prisma.user.upsert({
        where: { email: superAdminEmail },
        update: {},
        create: {
            fullName: 'Super Admin',
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
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });