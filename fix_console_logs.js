import fs from 'fs';
import path from 'path';

const directory = './AntiCheatsBP/scripts';

function commentConsoleLogs(filePath) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }

        const updatedData = data.replace(/console\.log/g, '// console.log');

        fs.writeFile(filePath, updatedData, 'utf8', (err) => {
            if (err) {
                console.error(err);
            }
        });
    });
}

function traverseDirectory(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stat) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (stat.isDirectory()) {
                    traverseDirectory(filePath);
                } else if (path.extname(filePath) === '.js') {
                    commentConsoleLogs(filePath);
                }
            });
        });
    });
}

traverseDirectory(directory);
