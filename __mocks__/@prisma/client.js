const rides = [];
const insuranceDocs = [];
const auditLogs = [];

class PrismaClient {
  constructor() {
    this.ride = {
      create: async ({ data }) => {
        const ride = { id: String(rides.length + 1), ...data };
        rides.push(ride);
        return ride;
      },
      findMany: async ({ where = {}, orderBy, include } = {}) => {
        let result = rides.filter(r => {
          if (where.status && r.status !== where.status) return false;
          if (where.driver_id && r.driver_id !== where.driver_id) return false;
          if (where.patient_id && r.patient_id !== where.patient_id) return false;
          if (where.pickup_time) {
            const { gte, lt } = where.pickup_time;
            const t = new Date(r.pickup_time);
            if (gte && t < gte) return false;
            if (lt && t >= lt) return false;
          }
          return true;
        });
        if (orderBy && orderBy.pickup_time === 'asc') {
          result.sort((a,b) => new Date(a.pickup_time) - new Date(b.pickup_time));
        }
        if (include) {
          result = result.map(r => ({
            ...r,
            patient: include.patient ? { phone: 'p' } : undefined,
            driver: include.driver ? { phone: 'd' } : undefined
          }));
        }
        return result;
      },
      findUnique: async ({ where, select }) => {
        let ride;
        if (where.id) ride = rides.find(r => r.id === where.id);
        if (!ride && where.stripe_payment_id) ride = rides.find(r => r.stripe_payment_id === where.stripe_payment_id);
        if (!ride) return null;
        if (select) {
          const result = {};
          for (const key in select) result[key] = ride[key];
          return result;
        }
        return ride;
      },
      update: async ({ where, data }) => {
        const ride = rides.find(r => r.id === where.id || r.stripe_payment_id === where.stripe_payment_id);
        if (!ride) throw new Error('not found');
        Object.assign(ride, data);
        return ride;
      }
    };
    this.insuranceDoc = {
      create: async ({ data }) => {
        insuranceDocs.push({ id: String(insuranceDocs.length + 1), ...data });
      },
      findUnique: async ({ where }) => {
        return insuranceDocs.find(d => d.id === where.id) || null;
      }
    };
    this.auditLog = {
      create: async ({ data }) => {
        auditLogs.push({ id: String(auditLogs.length + 1), ...data });
      }
    };
    this.$queryRaw = async () => [{ '?column?': 1 }];
  }
}

module.exports = { PrismaClient, __rides: rides, __insuranceDocs: insuranceDocs };
