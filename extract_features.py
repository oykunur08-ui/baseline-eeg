import numpy as np
from scipy.signal import welch

from build_subject_dataset import X_train, X_test
from channel_select import select_channels, EMOTIV_LIKE


FS = 250

BANDS = {
    "theta": (4, 8),
    "alpha": (8, 13),
    "beta": (13, 30),
}


def bandpower(signal, fs, band):

    freqs, psd = welch(signal, fs=fs, nperseg=fs*2)

    idx = (freqs >= band[0]) & (freqs <= band[1])

    return np.trapz(psd[idx], freqs[idx])


def extract_trial_features(trial):

    features = []

    for ch in range(trial.shape[1]):

        sig = trial[:, ch]

        # band powers
        for band in BANDS.values():
            bp = bandpower(sig, FS, band)
            features.append(bp)

        # variance
        features.append(np.var(sig))

    return np.array(features)


# simulate wearable channels
X_train_small = select_channels(X_train, EMOTIV_LIKE)
X_test_small = select_channels(X_test, EMOTIV_LIKE)

# extract features
train_features = np.array([
    extract_trial_features(t)
    for t in X_train_small
])

test_features = np.array([
    extract_trial_features(t)
    for t in X_test_small
])

print("Train features:", train_features.shape)
print("Test features:", test_features.shape)


