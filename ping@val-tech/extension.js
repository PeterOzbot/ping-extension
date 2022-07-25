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
const Mainloop = imports.mainloop;

let panelButton;
let panelButtonText;
let timeout;

let xchgUpdated = true;

function get_ping() {

    if (!xchgUpdated) {
        return;
    }
    xchgUpdated = false;

    try {
        let proc = Gio.Subprocess.new(
            ['/bin/ping', '-c', '1', '8.8.8.8'],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
        proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {

                    setButtonText(stdout);
                } else {
                    panelButtonText.set_text(stderr);
                }
            } catch (e) {
                try {
                    panelButtonText.set_text(e.message);
                }
                catch {
                    panelButtonText.set_text('error');
                }
            }

            xchgUpdated = true;
        });
    } catch (e) {
        xchgUpdated = true;
    }
    return true;
}
function setButtonText(out) {
    let str = out.toString().replace('\n', '');

    let latencyRegex = /([0-9]+\.?[0-9]+) ms/g;

    let regexResult = str.match(latencyRegex);
    if (regexResult && regexResult.length != 0) {
        panelButtonText.set_text('Ping: ' + regexResult[0].toString());
        return true;
    }

    panelButtonText.set_text('Ping: unreachable');

    return true;
}

function init() { }

function enable() {

    panelButton = new St.Bin({
        style_class: "panel-button"
    });

    panelButtonText = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        text: '...'
    });

    panelButton.set_child(panelButtonText);

    Main.panel._rightBox.insert_child_at_index(panelButton, 1);
    timeout = Mainloop.timeout_add_seconds(1.0, get_ping);
}

function disable() {
    Mainloop.source_remove(timeout);
    Main.panel._rightBox.remove_child(panelButton);
}
