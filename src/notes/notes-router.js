const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
    id: note.id,
    note_name: xss(note.note_name),
    content: xss(note.content),
    date_modified: note.date_modified,
    folder_id: note.folder_id
});

notesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        NotesService.getAllNotes(knexInstance)
            .then(notes => {
                res.json(notes.map(serializeNote));
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { note_name, content, folder_id } = req.body;
        const newNote = { note_name, content, folder_id };

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing ${key} in request` }
                });
            }
        }
        const knexInstance = req.app.get('db');
        NotesService.insertNotes(
            knexInstance,
            newNote
        )
            .then(note => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    .json(serializeNote(note))
            })
            .catch(next)
    })
notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        const routeParameter = req.params.note_id;
        NotesService.getById(knexInstance, routeParameter)
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: 'Note does not exist' }
                    });
                }

                res.note = note;
                next()
            })
            .catch(next);
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.note));
    })
    .delete((req, res, next) => {
        NotesService.deleteNotes(
            req.app.get('db'),
            req.params.note_id
        )
            .then(numRowsAffected => {
                res.status(204).end();
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { id, note_name, content, folder_id } = req.body;
        const noteToUpdate = { id, note_name, content, folder_id };

        const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
        if (numberOfValues === 0)
            return res.status(400).json({
                error: {
                    message: `Request body must have an id, name, content, and folder id`
                }
            });

        NotesService.updateNote(
            req.app.get('db'),
            req.params.note_id,
            noteToUpdate
        )
            .then(note => {
                res.status(204).json(serializeNote(note));
            })
            .catch(next)
    });

module.exports = notesRouter;
