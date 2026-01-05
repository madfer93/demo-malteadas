// Cliente Supabase - Sipote Malteada
// Las credenciales se cargan desde config.js

// Query Builder con soporte para encadenamiento
class QueryBuilder {
    constructor(table) {
        this.table = table;
        this.filters = [];
        this.columns = '*';
        this.method = 'GET';
        this.body = null;
        this.orderColumn = null;
        this.orderAsc = true;
        this.limitCount = null;
    }

    select(columns = '*') {
        this.columns = columns;
        // Solo cambiar a GET si no hay body (no es insert/update)
        if (!this.body) {
            this.method = 'GET';
        }
        this._returnData = true;
        return this;
    }

    insert(data) {
        this.method = 'POST';
        this.body = data;
        return this;
    }

    update(data) {
        this.method = 'PATCH';
        this.body = data;
        return this;
    }

    delete() {
        this.method = 'DELETE';
        return this;
    }

    eq(column, value) {
        this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
        return this;
    }

    neq(column, value) {
        this.filters.push(`${column}=neq.${encodeURIComponent(value)}`);
        return this;
    }

    gt(column, value) {
        this.filters.push(`${column}=gt.${encodeURIComponent(value)}`);
        return this;
    }

    gte(column, value) {
        this.filters.push(`${column}=gte.${encodeURIComponent(value)}`);
        return this;
    }

    lt(column, value) {
        this.filters.push(`${column}=lt.${encodeURIComponent(value)}`);
        return this;
    }

    lte(column, value) {
        this.filters.push(`${column}=lte.${encodeURIComponent(value)}`);
        return this;
    }

    like(column, value) {
        this.filters.push(`${column}=like.${encodeURIComponent(value)}`);
        return this;
    }

    ilike(column, value) {
        this.filters.push(`${column}=ilike.${encodeURIComponent(value)}`);
        return this;
    }

    is(column, value) {
        this.filters.push(`${column}=is.${encodeURIComponent(value)}`);
        return this;
    }

    in(column, values) {
        this.filters.push(`${column}=in.(${values.map(v => encodeURIComponent(v)).join(',')})`);
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.orderColumn = column;
        this.orderAsc = ascending;
        return this;
    }

    limit(count) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.limitCount = 1;
        this._single = true;
        return this;
    }

    async then(resolve, reject) {
        try {
            const result = await this._execute();
            resolve(result);
        } catch (err) {
            if (reject) reject(err);
            else resolve({ data: null, error: err });
        }
    }

    async _execute() {
        let url = `${SUPABASE_URL}/rest/v1/${this.table}`;
        const params = [];

        if (this.method === 'GET') {
            params.push(`select=${this.columns}`);
        }

        if (this.filters.length > 0) {
            params.push(...this.filters);
        }

        if (this.orderColumn) {
            params.push(`order=${this.orderColumn}.${this.orderAsc ? 'asc' : 'desc'}`);
        }

        if (this.limitCount) {
            params.push(`limit=${this.limitCount}`);
        }

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        };

        if (this.body) {
            headers['Content-Type'] = 'application/json';
            headers['Prefer'] = 'return=representation';
        }

        const options = {
            method: this.method,
            headers
        };

        if (this.body) {
            options.body = JSON.stringify(this.body);
        }

        const res = await fetch(url, options);
        let data = null;

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        }

        if (!res.ok) {
            return { data: null, error: data || { message: res.statusText } };
        }

        // Para single(), devolver el primer elemento o null
        if (this._single && Array.isArray(data)) {
            data = data[0] || null;
        }

        return { data, error: null };
    }
}

// Cliente Supabase
const supabase = {
    from: (table) => new QueryBuilder(table)
};

// Exportar para uso global
window.supabase = supabase;
window.SUPABASE_URL = SUPABASE_URL;
