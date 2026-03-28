import { prisma } from '../src/lib/prisma.js';
async function main() {
    console.log('TripSync seed: no baseline records to create yet.');
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map