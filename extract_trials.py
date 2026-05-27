from scipy.io import loadmat
import numpy as np

data = loadmat("./data/raw/bnci_001_2014/A01T.mat")

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

        all_trials.append(eeg)
        all_labels.append(int(label))

all_trials = np.array(all_trials)
all_labels = np.array(all_labels)

print("Trials:", all_trials.shape)
print("Labels:", all_labels.shape)



