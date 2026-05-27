from scipy.io import loadmat

data = loadmat("./data/raw/bnci_001_2014/A01T.mat")

for i in range(9):
    run = data['data'][0, i]

    X = run['X'][0,0]
    trials = run['trial'][0,0]
    labels = run['y'][0,0]

    print(f"RUN {i}")
    print("X:", X.shape)
    print("trials:", trials.shape)
    print("labels:", labels.shape)
    print("---")

