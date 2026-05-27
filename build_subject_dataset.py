from scipy.io import loadmat
import numpy as np


def extract_trials(path):

    data = loadmat(path)

    all_trials = []
    all_labels = []

    for i in range(9):

        run = data['data'][0, i]

        X = run['X'][0,0]
        trials = run['trial'][0,0]
        labels = run['y'][0,0]

        # skip empty runs
        if trials.shape[0] == 0:
            continue

        fs = int(run['fs'][0,0][0,0])

        # 4-second window
        window = 4 * fs

        for t, label in zip(trials.flatten(), labels.flatten()):

            start = int(t)
            end = start + window

            if end > X.shape[0]:
                continue

            eeg = X[start:end]

            # ---------------------------------
            # KEEP ONLY LEFT VS RIGHT HAND
            # ---------------------------------

            # left hand = 1
            # right hand = 2
            if int(label) not in [1, 2]:
                continue

            all_trials.append(eeg)

            # remap:
            # left  -> 0
            # right -> 1
            all_labels.append(int(label) - 1)

    return np.array(all_trials), np.array(all_labels)


# ---------------------------------
# TRAIN SESSION
# ---------------------------------

X_train, y_train = extract_trials(
    "./data/raw/bnci_001_2014/A01T.mat"
)

# ---------------------------------
# TEST SESSION
# ---------------------------------

X_test, y_test = extract_trials(
    "./data/raw/bnci_001_2014/A01E.mat"
)

print("TRAIN:", X_train.shape)
print("TEST:", X_test.shape)

print("TRAIN LABELS:", np.bincount(y_train))
print("TEST LABELS:", np.bincount(y_test))

