import React from 'react';
import {Dimensions, Keyboard} from 'react-native';
import _ from 'underscore';
import EmojiPickerMenu from '../EmojiPickerMenu';
import CONST from '../../../CONST';
import PopoverWithMeasuredContent from '../../PopoverWithMeasuredContent';
import compose from '../../../libs/compose';
import withViewportOffsetTop, {viewportOffsetTopPropTypes} from '../../withViewportOffsetTop';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../withWindowDimensions';

const propTypes = {
    ...viewportOffsetTopPropTypes,
    ...windowDimensionsPropTypes,
};

const DEFAULT_ANCHOR_ORIGIN = {
    horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
    vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.BOTTOM,
};

class EmojiPicker extends React.Component {
    constructor(props) {
        super(props);

        this.hideEmojiPicker = this.hideEmojiPicker.bind(this);
        this.showEmojiPicker = this.showEmojiPicker.bind(this);
        this.selectEmoji = this.selectEmoji.bind(this);
        this.measureEmojiPopoverAnchorPosition = this.measureEmojiPopoverAnchorPosition.bind(this);
        this.measureEmojiPopoverAnchorPositionAndUpdateState = this.measureEmojiPopoverAnchorPositionAndUpdateState.bind(this);
        this.focusEmojiSearchInput = this.focusEmojiSearchInput.bind(this);
        this.measureContent = this.measureContent.bind(this);
        this.onModalHide = () => {};
        this.onEmojiSelected = () => {};

        this.state = {
            isEmojiPickerVisible: false,

            // The horizontal and vertical position (relative to the window) where the emoji popover will display.
            emojiPopoverAnchorPosition: {
                horizontal: 0,
                vertical: 0,
            },

            emojiPopoverAnchorOrigin: DEFAULT_ANCHOR_ORIGIN,
        };
    }

    componentDidMount() {
        this.emojiPopoverDimensionListener = Dimensions.addEventListener('change', this.measureEmojiPopoverAnchorPositionAndUpdateState);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.isEmojiPickerVisible === this.state.isEmojiPickerVisible || !this.state.isEmojiPickerVisible) {
            return;
        }

        // Dismiss the keyboard to provide a focus for the emoji picker to avoid selection issues.
        Keyboard.dismiss();
    }

    componentWillUnmount() {
        if (!this.emojiPopoverDimensionListener) {
            return;
        }
        this.emojiPopoverDimensionListener.remove();
    }

    /**
     * Callback for the emoji picker to add whatever emoji is chosen into the main input
     *
     * @param {String} emoji
     * @param {Object} emojiObject
     */
    selectEmoji(emoji, emojiObject) {
        // Prevent fast click / multiple emoji selection;
        // The first click will hide the emoji picker by calling the hideEmojiPicker() function
        // and in that function the emojiPopoverAnchor prop to will be set to null (synchronously)
        // thus we rely on that prop to prevent fast click / multiple emoji selection
        if (!this.emojiPopoverAnchor) {
            return;
        }

        this.hideEmojiPicker();
        if (_.isFunction(this.onEmojiSelected)) {
            this.onEmojiSelected(emoji, emojiObject);
        }
    }

    /**
     * Hide the emoji picker menu.
     *
     * @param {Boolean} isNavigating
     */
    hideEmojiPicker(isNavigating) {
        if (isNavigating) { this.onModalHide = () => {}; }
        this.emojiPopoverAnchor = null;
        this.setState({isEmojiPickerVisible: false});
    }

    /**
     * Show the emoji picker menu.
     *
     * @param {Function} [onModalHide=() => {}] - Run a callback when Modal hides.
     * @param {Function} [onEmojiSelected=() => {}] - Run a callback when Emoji selected.
     * @param {Element} emojiPopoverAnchor - Element to which Popover is anchored
     * @param {Object} [anchorOrigin=DEFAULT_ANCHOR_ORIGIN] - Anchor origin for Popover
     * @param {Function} [onWillShow=() => {}] - Run a callback when Popover will show
     */
    showEmojiPicker(onModalHide, onEmojiSelected, emojiPopoverAnchor, anchorOrigin, onWillShow = () => {}) {
        this.onModalHide = onModalHide;
        this.onEmojiSelected = onEmojiSelected;
        this.emojiPopoverAnchor = emojiPopoverAnchor;

        if (this.emojiPopoverAnchor) {
            // Drop focus to avoid blue focus ring.
            emojiPopoverAnchor.blur();
        }

        this.measureEmojiPopoverAnchorPosition().then((emojiPopoverAnchorPosition) => {
            onWillShow();
            this.setState({isEmojiPickerVisible: true, emojiPopoverAnchorPosition, emojiPopoverAnchorOrigin: anchorOrigin || DEFAULT_ANCHOR_ORIGIN});
        });
    }

    measureEmojiPopoverAnchorPosition() {
        return new Promise((resolve) => {
            if (!this.emojiPopoverAnchor) {
                return resolve({horizontal: 0, vertical: 0});
            }
            this.emojiPopoverAnchor.measureInWindow((x, y, width) => resolve({horizontal: x + width, vertical: y}));
        });
    }

    measureEmojiPopoverAnchorPositionAndUpdateState() {
        this.measureEmojiPopoverAnchorPosition().then((emojiPopoverAnchorPosition) => {
            this.setState({emojiPopoverAnchorPosition});
        });
    }

    /**
     * Used to calculate the EmojiPicker Dimensions
     *
     * @returns {JSX}
     */
    measureContent() {
        return (
            <EmojiPickerMenu
                onEmojiSelected={this.selectEmoji}
                ref={el => this.emojiSearchInput = el}
            />
        );
    }

    /**
     * Focus the search input in the emoji picker.
     */
    focusEmojiSearchInput() {
        if (!this.emojiSearchInput) {
            return;
        }
        this.emojiSearchInput.focus();
    }

    render() {
        // There is no way to disable animations and they are really laggy, because there are so many
        // emojis. The best alternative is to set it to 1ms so it just "pops" in and out
        return (
            <PopoverWithMeasuredContent
                isVisible={this.state.isEmojiPickerVisible}
                onClose={this.hideEmojiPicker}
                onModalShow={this.focusEmojiSearchInput}
                onModalHide={this.onModalHide}
                hideModalContentWhileAnimating
                shouldSetModalVisibility={false}
                animationInTiming={1}
                animationOutTiming={1}
                anchorPosition={{
                    vertical: this.state.emojiPopoverAnchorPosition.vertical,
                    horizontal: this.state.emojiPopoverAnchorPosition.horizontal,
                }}
                popoverDimensions={{
                    width: CONST.EMOJI_PICKER_SIZE.WIDTH,
                    height: CONST.EMOJI_PICKER_SIZE.HEIGHT,
                }}
                anchorOrigin={this.state.emojiPopoverAnchorOrigin}
                measureContent={this.measureContent}
                outerStyle={{maxHeight: this.props.windowHeight, marginTop: this.props.viewportOffsetTop}}
            >
                <EmojiPickerMenu
                    onEmojiSelected={this.selectEmoji}
                    ref={el => this.emojiSearchInput = el}
                />
            </PopoverWithMeasuredContent>
        );
    }
}

EmojiPicker.propTypes = propTypes;

export default compose(
    withViewportOffsetTop,
    withWindowDimensions,
)(EmojiPicker);
