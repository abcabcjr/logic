
export class TextReader {
    constructor(text) {
        this._input = text.trim();
        this._index = 0;
    }

    peek() {
        if (this._index >= this._input.length)
            return null;
        return this._input.charAt(this._index);
    }

    advance() {
        // skip over spaces
        do {
            this._index++;
        } while (this.hasNext() && this.peek() === ' ');
    }

    hasNext() {
        return this._index < this._input.length;
    }

    getPosition() {
        return this._index;
    }
}