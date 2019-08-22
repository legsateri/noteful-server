const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe.only('Notes endpoints', () => {
    let db;
    before('make knexInstance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db);
    });

    after('disconnect from db', () => db.destroy());

    before('clean the tables', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

    describe('GET /api/notes', () => {
        context('Given no notes', () => {
            it('responds w/ 200 and an empty list', () => {
                return request(app)
                    .get('/api/notes')
                    .expect(200, [])
            })
        });

        context('Given there are notes in the database', () => {
            const testNotes = makeNotesArray();
            const testFolders = makeFoldersArray();

            beforeEach('insert folders, then notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it('responds w/ 200 and all the notes', () => {
                return request(app)
                    .get('/api/notes')
                    .expect(200, testNotes)
            });
        });
    });

    describe('GET /api/notes/:note_id', () => {

        context('Given no notes', () => {
            it('responds w/ 404', () => {
                const noteId = 12345;
                return request(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(404)
            })
        });

        context('Given there are notes in the database', () => {
            const testNotes = makeNotesArray();
            const testFolders = makeFoldersArray();

            beforeEach('insert folders, then notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it('responds w/ 200 and the specified note', () => {
                const noteId = 2;
                const expectedNote = testNotes[noteId - 1];
                return request(app)
                    .get(`/api/notes/${noteId}`)
                    .expect(200, expectedNote)
            })
        })
    });

    describe('POST /api/notes', () => {
        const testFolders = makeFoldersArray();

        beforeEach('insert folders', () => {
            return db
                .into('noteful_folders')
                .insert(testFolders)
        });

        it('creates a note, responding w/ 201 and the new note', () => {
            const newNote = {
                id: 8,
                note_name: 'Brand New Note',
                content: 'This is a brand new note',
                folder_id: 3
            };
            return request(app)
                .post('/api/notes')
                .send(newNote)
                .expect(201)
                .expect(res => {
                    expect(res.body).to.have.property('id');
                    expect(res.body.note_name).to.eql(newNote.note_name);
                    expect(res.body.content).to.eql(newNote.content);
                    expect(res.body.folder_id).to.eql(newNote.folder_id);
                    expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
                })
                .then(res =>
                    request(app)
                        .get(`/api/notes/${res.body.id}`)
                        .expect(res.body)
                );
        });

        const requiredNoteFields = ['note_name', 'content', 'folder_id'];
        requiredNoteFields.forEach(field => {
            const newNote = {
                note_name: 'Test new note',
                content: 'This is a super test',
                folder_id: 1
            };

            it(`responds w/ 400 and an error when the ${field} is missing`, () => {
                delete newNote[field];

                return request(app)
                    .post('/api/notes')
                    .send(newNote)
                    .expect(400, {
                        error: { message: `Missing ${field} in request` }
                    })
            });
        });
    });

    describe('DELETE /api/notes/:note_id', () => {

        context('Given no notes', () => {
            it('responds w/ 404', () => {
                const noteId = 12345;
                return request(app)
                    .delete(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: 'Note does not exist' }
                    })
            });
        });

        context('Given there are notes in the db', () => {
            const testFolders = makeFoldersArray();
            const testNotes = makeNotesArray();

            before('insert folders, then notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it('responds w/ 204(no content) and removes the note', () => {
                const idToRemove = 2;
                const expectedNotes = testNotes.filter(note => note.id !== idToRemove);
                return request(app)
                    .delete(`/api/notes/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        request(app)
                            .get(`/api/notes`)
                            .expect(expectedNotes)
                    );
            });
        });
    });

    describe('PATCH /api/notes/:note_id', () => {
        context('Given no notes', () => {
            it('responds w/ 404', () => {
                const noteId = 12345;
                return request(app)
                    .patch(`/api/notes/${noteId}`)
                    .expect(404, {
                        error: { message: 'Note does not exist' }
                    })
            });
        });

        context('Given there are notes in the db', () => {
            const testNotes = makeNotesArray();
            const testFolders = makeFoldersArray();

            beforeEach('insert folders, then notes', () => {
                return db
                    .into('noteful_folders')
                    .insert(testFolders)
                    .then(() => {
                        return db
                            .into('noteful_notes')
                            .insert(testNotes)
                    })
            });

            it('responds w/ 204 (no content) & updates the note', () => {
                const idToUpdate = 1;
                const updatedNote = {
                    note_name: 'Test updated note',
                    content: 'This note was updated',
                    folder_id: 1
                };

                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    ...updatedNote
                };
                return request(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send(updatedNote)
                    .expect(204)
                    .then(res =>
                        request(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)
                    );
            });

            it('reponds w/ 400 when no required fields supplied', () => {
                const idToUpdate = 2;
                return request(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({ unrelatedField: 'foo' })
                    .expect(400)
            });

            it.skip('responds w/ 204 when updating only a subset of fields', () => {
                const idToUpdate = 2;
                const updateNote = {
                    content: 'Content was the only field changed'
                }
                const expectedNote = {
                    ...testNotes[idToUpdate - 1],
                    updateNote
                };

                return request(app)
                    .patch(`/api/notes/${idToUpdate}`)
                    .send({
                        ...updateNote,
                        ignoreField: 'Should not be included'
                    })
                    .expect(204)
                    .then(res =>
                        request(app)
                            .get(`/api/notes/${idToUpdate}`)
                            .expect(expectedNote)
                    )
            })
        });
    });
})
