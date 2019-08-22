function makeNotesArray() {
    return [
        {
            id: 1,
            note_name: 'Test Note 1',
            content: 'This is a test for note 1',
            date_modified: "2019-03-17T21:22:26.221Z",
            folder_id: 1
        },
        {
            id: 2,
            note_name: 'Test Note 2',
            content: 'This is a test for note 2',
            date_modified: "2019-03-17T21:22:26.221Z",
            folder_id: 3
        },
        {
            id: 3,
            note_name: 'Test Note 3',
            content: 'This is a test for note 3',
            date_modified: "2019-03-17T21:22:26.221Z",
            folder_id: 1
        },
        {
            id: 4,
            note_name: 'Test Note 4',
            content: 'This is a test for note 4',
            date_modified: "2019-03-17T21:22:26.221Z",
            folder_id: 2
        }
    ]
}

module.exports = {
    makeNotesArray
}
