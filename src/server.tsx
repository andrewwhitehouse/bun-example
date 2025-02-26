import { type Context, Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { Database } from 'bun:sqlite';

type Dog = { id: string; name: string; breed: string };
//const dogs = new Map<string, Dog>();

const db = new Database("dogs.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS dogs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    breed TEXT NOT NULL
  )
`);

function addDog(name: string, breed: string): Dog {
    const id = crypto.randomUUID(); 
    const dog = { id, name, breed };

    db.query(
        `INSERT INTO dogs (id, name, breed)
         VALUES (?, ?, ?)`,
      ).run(id, dog.name, dog.breed);

    return dog;
}

function initDatabase() {
    const result = 
        db.query(`SELECT COUNT(*) as rows FROM dogs`).get() as {rows: number};

    if (result.rows == 0) {
        console.log("Initialising database");
        addDog('Comet', 'Whippet');
        addDog('Oscar', 'German Shorthaired Pointer');
    }
}

function dogRow(dog: Dog) {

    return (
        <tr class="on-hover">
            <td>{dog.name}</td>
            <td>{dog.breed}</td>
            <td class="buttons">
                <button
                    class="show-on-hover"
                    hx-delete={`/dog/${dog.id}`}
                    hx-confirm="Are you sure?"
                    hx-target="closest tr"
                    hx-swap="delete"
                >
                    ✕
                </button>
            </td>
        </tr>
    );
}

const app = new Hono();

initDatabase();

app.use('/*', serveStatic({ root: './public' }));

app.get('/table-rows', (c: Context) => {

    const dogs = db.query("SELECT * FROM dogs").all() as Dog[];
    
    const sortedDogs = Array.from(dogs.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    return c.html(<>{sortedDogs.map(dogRow)}</>);
});

app.post('/dog', async (c: Context) => {
    const formData = await c.req.formData();
    const name = (formData.get('name') as string) || '';
    const breed = (formData.get('breed') as string) || '';
    const dog = addDog(name, breed);
    return c.html(dogRow(dog), 201);
});

app.delete('/dog/:id', (c: Context) => {
    const id = c.req.param('id');
    
    db.query(
        `DELETE FROM dogs WHERE id = ?`,
      ).run(id);
    
    return c.body(null);
});

export default app;