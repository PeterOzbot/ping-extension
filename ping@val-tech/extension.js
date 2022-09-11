/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const { St, GLib, Clutter } = imports.gi;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;

class Extension {

    panelButton;
    panelButtonText;

    onProcExited(proc, result) {
        log("ping@val-tech:: onProcExited");
        try {
            proc.wait_check_finish(result);
        } catch (e) {
            logError(e);
        }
    }

    onLineRead(stdout, result) {

        try {
            let line = stdout.read_line_finish_utf8(result)[0];

            // %null generally means end of stream
            if (line !== null) {
                // Here you can do whatever processing on the line
                // you need to do, and this will be non-blocking as
                // all the I/O was done in a thread.
                this.setButtonText(line);

                // Now you can request the next line
                stdout.read_line_async(GLib.PRIORITY_DEFAULT, null, this.onLineRead.bind(this));
            }
        } catch (e) {
            logError(e);
        }
    }

    startPingProcess() {
        log("ping@val-tech:: start -> startPingProcess");
        try {
            if (this._proc) {
                log("ping@val-tech:: startPingProcess - already running");
                return;
            }
            this._proc = new Gio.Subprocess({
                argv: ['/bin/ping', '8.8.8.8'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE
            });
            this._proc.init(null);

            // Get the stdout pipe and wrap it in a buffered stream
            // with some useful helpers
            let stdout = new Gio.DataInputStream({
                base_stream: this._proc.get_stdout_pipe()
            });

            // This function will spawn dedicated a thread, reading and buffering
            // bytes until it finds a line ending and then invoke onLineRead() in
            // in the main thread.
            stdout.read_line_async(
                GLib.PRIORITY_DEFAULT,
                null, // Cancellable, if you want it
                this.onLineRead.bind(this)
            );

            // Check the process completion
            this._proc.wait_check_async(null, this.onProcExited.bind(this));
        } catch (e) {
            logError(e);
        }
    }

    setButtonText(str) {
        let latencyRegex = /([0-9]+\.?[0-9]+) ms/g;

        let regexResult = str.match(latencyRegex);
        if (regexResult && regexResult.length != 0) {
            this.panelButtonText.set_text('Ping: ' + regexResult[0].toString());
            return true;
        }

        this.panelButtonText.set_text(str);

        return true;
    }

    openTerminal() {
        GLib.spawn_command_line_async("gnome-terminal -- ping 8.8.8.8");
    }

    constructor() {
        this._indicator = null;
    }

    enable() {
        log("ping@val-tech:: enable");
        this.panelButtonText = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            text: '...',
            style_class: 'ping_label'
        });

        this.panelButton = new St.Bin({
            reactive: true
        });

        this.panelButton.connect('button-press-event', this.openTerminal);

        this.panelButton.set_child(this.panelButtonText);
        Main.panel._rightBox.insert_child_at_index(this.panelButton, 1);

        this.startPingProcess();
    }

    disable() {
        log("ping@val-tech:: disable");
        Main.panel._rightBox.remove_child(this.panelButton);
    }
}


function init() {
    return new Extension();
}